#!/usr/bin/env node
// acp.mjs - a small ACP (Agent Client Protocol) client so Claude Code can orchestrate
// Devin, OpenCode, Cursor and Antigravity (agy) agents: start sessions (optionally in a git
// worktree), send prompts, follow events, and approve/deny tool permissions while a turn runs.
//
// Each session is a detached daemon exposing a token-protected HTTP API on 127.0.0.1; the CLI
// talks to it. For ACP agents the daemon owns the agent's stdio (JSON-RPC, one message per
// line). agy has no ACP server, so it runs one print-mode process per turn, gated by a hook.
// No dependencies; Node >= 20.

import { spawn, execFileSync } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const HOME = process.env.ACP_HOME || path.join(os.homedir(), '.claude', 'acp-bridge', 'sessions');
const IS_WIN = process.platform === 'win32';
const POLICIES = ['ask', 'edits', 'read-only', 'yolo'];
const READ_KINDS = new Set(['read', 'search', 'think', 'fetch']);

// ---------------------------------------------------------------- agent resolution

function which(bin) {
  try {
    const out = execFileSync(IS_WIN ? 'where.exe' : 'which', [bin], { encoding: 'utf8' });
    const hits = out.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    return hits.find(h => /\.exe$/i.test(h)) || hits[0];
  } catch {
    throw new Error(`'${bin}' not found on PATH`);
  }
}

// The cursor-agent launcher is a .ps1 shim; run the bundled node + index.js directly
// so stdio stays a clean pipe.
function cursorCommand() {
  const base = path.join(process.env.LOCALAPPDATA || '', 'cursor-agent');
  const versions = fs.existsSync(path.join(base, 'versions'))
    ? fs.readdirSync(path.join(base, 'versions')).filter(v => /^\d{4}\.\d{1,2}\.\d{1,2}-[a-f0-9]+$/.test(v))
    : [];
  if (!versions.length) {
    try { return { cmd: which('cursor-agent'), args: ['acp'] }; } catch { return { cmd: which('agent'), args: ['acp'] }; }
  }
  const key = v => v.split('-')[0].split('.').map(n => n.padStart(2, '0')).join('');
  const latest = versions.sort((a, b) => key(b).localeCompare(key(a)))[0];
  const dir = path.join(base, 'versions', latest);
  return {
    cmd: path.join(dir, IS_WIN ? 'node.exe' : 'node'),
    args: [path.join(dir, 'index.js'), 'acp'],
    env: { CURSOR_INVOKED_AS: 'agent', NODE_COMPILE_CACHE: path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'cursor-compile-cache') },
  };
}

const AGENTS = {
  devin: () => ({ cmd: which('devin'), args: ['acp'] }),
  opencode: () => ({ cmd: which('opencode'), args: ['acp'] }),
  cursor: cursorCommand,
  agy: () => ({ cmd: which('agy'), args: [] }),
};

// Agents only send session/request_permission for what their own harness gates, so each
// policy is also mapped onto the agent's native permission settings.
//  - opencode: permission config via OPENCODE_CONFIG_CONTENT (merged over opencode.json)
//  - cursor: 'agent' mode applies edits without asking; read-only uses its 'ask' mode
//  - devin: 'accept-edits' auto-approves edits inside its workspace, but writes them through
//    the client (fs/write_text_file), where the policy applies; read-only uses its 'ask'
//    mode (read-only tools only) and yolo its 'bypass' mode
function policyEnv(agent, policy) {
  if (agent !== 'opencode') return {};
  const p = policy === 'yolo' ? 'allow' : 'ask';
  return { OPENCODE_CONFIG_CONTENT: JSON.stringify({ permission: { edit: p, bash: p, webfetch: 'allow' } }) };
}
const DEFAULT_MODE = { cursor: { 'read-only': 'ask' }, devin: { 'read-only': 'ask', yolo: 'bypass' } };

// ---------------------------------------------------------------- session files

const sessDir = id => path.join(HOME, id);
const readJson = (f, dflt) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return dflt; } };
const writeJson = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 2));
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };

function loadSession(id) {
  const dir = sessDir(id);
  const cfg = readJson(path.join(dir, 'config.json'));
  const state = readJson(path.join(dir, 'state.json'), {});
  if (!cfg) throw new Error(`unknown session '${id}' (see: acp list)`);
  return { cfg, state };
}

async function api(id, method, route, body) {
  const { cfg, state } = loadSession(id);
  if (!state.port || !alive(state.pid)) throw new Error(`session '${id}' is not running (status: ${state.status || 'unknown'})`);
  const res = await fetch(`http://127.0.0.1:${state.port}${route}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-acp-token': cfg.token },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ---------------------------------------------------------------- daemon

function decide(policy, tc) {
  const kind = tc.kind || 'other';
  if (policy === 'yolo') return 'allow';
  if (READ_KINDS.has(kind)) return 'allow';
  if (policy === 'read-only') return 'deny';
  if (policy === 'edits' && kind === 'edit') return 'allow';
  return 'ask';
}

function pickOption(options, decision) {
  const byKind = k => options.find(o => o.kind === k);
  if (decision === 'always') return byKind('allow_always') || byKind('allow_once');
  if (decision === 'allow') return byKind('allow_once') || byKind('allow_always');
  return byKind('reject_once') || byKind('reject_always');
}

const freePort = () => new Promise((resolve, reject) => {
  const srv = net.createServer();
  srv.on('error', reject);
  srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
});

// Agents may send Windows extended-length paths (\\?\C:\... or \\?\UNC\server\...).
const localPath = p => String(p).replace(/^\\\\\?\\UNC\\/, '\\\\').replace(/^\\\\\?\\/, '');
const pathKey = p => { const r = path.resolve(localPath(p)); return IS_WIN ? r.toLowerCase() : r; };

const insideOne = (root, p) => {
  const rel = path.relative(path.resolve(root), path.resolve(p));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};

// A mapped network drive (U:\...) and its UNC form (\\server\share\...) are the same folder,
// and agents report either, so a root is compared in both forms.
const rootForms = new Map();
function formsOf(root) {
  if (rootForms.has(root)) return rootForms.get(root);
  const forms = [root];
  const drive = IS_WIN && /^([A-Za-z]):[\\/]/.exec(root);
  if (drive) {
    try {
      const out = execFileSync('net', ['use', `${drive[1]}:`], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
      const unc = /\\\\[^\s]+/.exec(out)?.[0];
      if (unc) forms.push(unc + root.slice(2));
    } catch { /* not a network drive */ }
  }
  rootForms.set(root, forms);
  return forms;
}
const inside = (root, p) => formsOf(root).some(r => insideOne(r, localPath(p)));

const killTree = pid => {
  try {
    if (IS_WIN) execFileSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
    else process.kill(pid);
  } catch { /* already gone */ }
};

// Resolves `wanted` against a config option's values: exact, else a unique substring.
function matchValue(values, wanted, configId) {
  if (!values.length || values.includes(wanted)) return wanted;
  const hits = values.filter(v => v.toLowerCase().includes(String(wanted).toLowerCase()));
  if (hits.length !== 1) throw new Error(`'${wanted}' ${hits.length ? 'is ambiguous' : 'matches nothing'} for ${configId}: ${(hits.length ? hits : values).slice(0, 15).join(', ')}`);
  return hits[0];
}

// One daemon per session. It owns the event log, the permission queue and the HTTP control
// API; a driver supplies the agent-specific parts (ACP over stdio, or agy's print mode).
async function daemon(id) {
  const dir = sessDir(id);
  const cfg = readJson(path.join(dir, 'config.json'));
  const logFd = fs.openSync(path.join(dir, 'events.jsonl'), 'a');
  const errFd = fs.openSync(path.join(dir, 'stderr.log'), 'a');

  const events = [];
  let seq = 0;
  const log = (type, data = {}) => {
    const e = { seq: ++seq, t: new Date().toISOString(), type, ...data };
    events.push(e);
    fs.writeSync(logFd, JSON.stringify(e) + '\n');
    return e;
  };

  const state = {
    id, agent: cfg.agent, cwd: cfg.cwd, policy: cfg.policy, pid: process.pid,
    status: 'starting', sessionId: null, turn: 0, busy: false, lastPromptSeq: 0,
  };
  const pending = new Map(); // req key -> { options, tc, resolve }
  let permCounter = 0;
  const refresh = () => {
    if (state.status === 'exited' || state.status === 'error' || state.status === 'starting') return;
    state.status = pending.size ? 'awaiting_permission' : state.busy ? 'working' : 'idle';
  };
  const save = () => { refresh(); state.seq = seq; state.pending = pending.size; writeJson(path.join(dir, 'state.json'), state); };

  // Resolves to the chosen option, or null when cancelled. The policy decides unless it says
  // 'ask'; then the request waits for `acp approve` / `acp deny` / `acp cancel`.
  const requestPermission = (tc, options) => new Promise(resolve => {
    const decision = decide(cfg.policy, tc);
    const info = { title: tc.title, kind: tc.kind || 'other', input: tc.rawInput };
    if (decision !== 'ask') {
      log('permission_auto', { ...info, decision });
      return resolve(pickOption(options, decision));
    }
    const key = String(++permCounter);
    pending.set(key, { options, tc, resolve });
    log('permission', { req: key, ...info, options: options.map(o => `${o.optionId} (${o.kind})`) });
    save();
  });

  const ctx = { cfg, state, log, save, errFd, requestPermission };
  const driver = cfg.agent === 'agy' ? agyDriver(ctx) : acpDriver(ctx);

  // ---- HTTP control API
  const server = http.createServer(async (req, res) => {
    const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (req.headers['x-acp-token'] !== cfg.token) return send(403, { error: 'bad token' });
    let body = '';
    for await (const chunk of req) body += chunk;
    const b = body ? JSON.parse(body) : {};
    const url = new URL(req.url, 'http://x');
    try {
      switch (`${req.method} ${url.pathname}`) {
        case 'GET /status':
          save();
          return send(200, { ...state, pendingRequests: [...pending].map(([req, v]) => ({ req, title: v.tc.title, kind: v.tc.kind, input: v.tc.rawInput, options: v.options })) });
        case 'GET /events': {
          const since = Number(url.searchParams.get('since') || 0);
          return send(200, events.filter(e => e.seq > since));
        }
        case 'POST /prompt': {
          if (state.status === 'starting') return send(409, { error: 'session still starting' });
          if (state.busy) return send(409, { error: 'a turn is already running; wait, or cancel it' });
          const turn = ++state.turn;
          state.busy = true;
          state.lastPromptSeq = seq;
          const since = seq;
          log('prompt', { turn, text: b.text });
          save();
          driver.prompt(b.text)
            .then(r => log('turn_end', { turn, stopReason: r?.stopReason, ...(r?.denied?.length ? { denied: r.denied } : {}) }))
            .catch(e => log('turn_end', { turn, error: e.message }))
            .finally(async () => { await driver.keepTitle(); state.busy = false; save(); });
          return send(200, { turn, since });
        }
        case 'POST /permission': {
          const p = pending.get(String(b.req));
          if (!p) return send(404, { error: `no pending request ${b.req}` });
          const opt = b.optionId ? p.options.find(o => o.optionId === b.optionId) : pickOption(p.options, b.decision);
          pending.delete(String(b.req));
          p.resolve(opt || null);
          log('permission_answer', { req: b.req, title: p.tc.title, choice: opt ? opt.optionId : 'cancelled' });
          save();
          return send(200, { ok: true, choice: opt?.optionId || 'cancelled' });
        }
        case 'POST /cancel':
          for (const [key, p] of pending) { p.resolve(null); pending.delete(key); }
          driver.cancel();
          log('cancel');
          save();
          return send(200, { ok: true });
        case 'POST /config':
          if (state.busy) return send(409, { error: 'cannot change config while a turn is running' });
          return send(200, { value: await driver.setConfig(b.configId, b.value) });
        case 'POST /title': {
          cfg.title = b.title;
          writeJson(path.join(dir, 'config.json'), cfg);
          const native = await driver.setNativeTitle(b.title);
          log('title', { title: b.title, native });
          save();
          return send(200, { native });
        }
        case 'POST /gate':
          if (!driver.gate) return send(404, { error: 'this agent does not use the gate' });
          return send(200, await driver.gate(b));
        case 'POST /stop':
          send(200, { ok: true });
          log('stopped');
          state.status = 'exited';
          save();
          return driver.shutdown(0);
        default:
          return send(404, { error: 'not found' });
      }
    } catch (e) {
      return send(500, { error: e.message });
    }
  });
  // Gate requests stay open while a permission waits for the orchestrator.
  server.requestTimeout = 0;
  server.timeout = 0;
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  state.port = server.address().port;
  save();

  try {
    await driver.start();
    if (cfg.title) {
      const native = await driver.setNativeTitle(cfg.title).catch(e => { log('title_error', { message: e.message }); return false; });
      log('title', { title: cfg.title, native });
    }
    state.status = 'idle';
    log('ready', { sessionId: state.sessionId, agent: state.agentInfo });
    save();
  } catch (e) {
    state.status = 'error';
    state.error = e.message;
    log('error', { message: e.message, data: e.data });
    save();
    driver.shutdown(1);
  }
}

// Files an edit permission refers to, from its locations or raw input.
const editPaths = tc => [
  ...(tc.locations || []).map(l => l.path),
  tc.rawInput?.file_path, tc.rawInput?.filepath, tc.rawInput?.path, tc.rawInput?.TargetFile,
].filter(Boolean).map(pathKey);
const WRITE_OPTIONS = [
  { optionId: 'allow', kind: 'allow_once' },
  { optionId: 'deny', kind: 'reject_once' },
];

// ---- ACP driver: Devin, OpenCode and Cursor, over JSON-RPC on the agent's stdio.
function acpDriver({ cfg, state, log, save, errFd, requestPermission }) {
  const toolCalls = new Map(); // toolCallId -> merged tool call
  let replaying = 0; // >0 while session/load replays history; those updates are counted, not logged
  const approvedWrites = new Set(); // pathKey()s of edits approved through session/request_permission

  const { cmd, args, env } = AGENTS[cfg.agent]();
  const agentArgs = [...args, ...(cfg.agentArgs || [])];
  // OpenCode renames sessions only through its HTTP server, so pin that server to a known port.
  let child;
  const spawnAgent = async () => {
    if (cfg.agent === 'opencode') {
      const i = agentArgs.indexOf('--port');
      if (i < 0) { state.agentHttpPort = await freePort(); agentArgs.push('--port', String(state.agentHttpPort)); }
      else state.agentHttpPort = Number(agentArgs[i + 1]);
    }
    child = spawn(cmd, agentArgs, {
      cwd: cfg.cwd, env: { ...process.env, ...env, ...policyEnv(cfg.agent, cfg.policy) }, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
    });
    state.agentPid = child.pid;
    child.stderr.on('data', d => fs.writeSync(errFd, d));
    child.on('exit', code => {
      log('agent_exit', { code });
      state.status = 'exited';
      for (const w of waiting.values()) w.reject(new Error('agent exited'));
      save();
      setTimeout(() => process.exit(0), 300);
    });
    readline.createInterface({ input: child.stdout }).on('line', onLine);
  };

  // JSON-RPC plumbing
  let nextId = 1;
  const waiting = new Map();
  const send = msg => child.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...msg }) + '\n');
  const request = (method, params) => new Promise((resolve, reject) => {
    const rid = nextId++;
    waiting.set(rid, { resolve, reject, method });
    send({ id: rid, method, params });
  });
  const notify = (method, params) => send({ method, params });
  const reply = (rid, result) => send({ id: rid, result });
  const replyError = (rid, code, message) => send({ id: rid, error: { code, message } });

  // Session config options (mode, model, ...), normalized to { id: { current, values } }.
  const setOptions = opts => {
    state.config = Object.fromEntries((opts || []).map(o => [o.id, {
      current: o.currentValue,
      values: (o.options || []).flatMap(x => (x.options ? x.options.map(y => y.value) : [x.value])),
    }]));
  };
  const setConfig = async (configId, wanted) => {
    const opt = state.config?.[configId];
    const value = matchValue(opt?.values || [], wanted, configId);
    if (opt) {
      const r = await request('session/set_config_option', { sessionId: state.sessionId, configId, value });
      if (r?.configOptions) setOptions(r.configOptions); else opt.current = value;
    } else if (configId === 'mode') await request('session/set_mode', { sessionId: state.sessionId, modeId: value });
    else if (configId === 'model') await request('session/set_model', { sessionId: state.sessionId, modelId: value });
    else throw new Error(`agent has no config option '${configId}'`);
    log('config', { configId, value });
    save();
    return value;
  };

  const onUpdate = u => {
    if (replaying) { replaying++; if (u.sessionUpdate === 'config_option_update') setOptions(u.configOptions); return; }
    switch (u.sessionUpdate) {
      case 'config_option_update': setOptions(u.configOptions); save(); break;
      case 'session_info_update': if (u.title) state.nativeTitle = u.title; break;
      case 'usage_update': break;
      case 'agent_message_chunk': if (u.content?.type === 'text') log('message', { text: u.content.text }); break;
      case 'agent_thought_chunk': if (u.content?.type === 'text') log('thought', { text: u.content.text }); break;
      case 'tool_call': {
        toolCalls.set(u.toolCallId, { ...u });
        log('tool_call', { id: u.toolCallId, title: u.title, kind: u.kind, status: u.status });
        break;
      }
      case 'tool_call_update': {
        const prev = toolCalls.get(u.toolCallId) || {};
        const merged = { ...prev, ...Object.fromEntries(Object.entries(u).filter(([, v]) => v != null)) };
        toolCalls.set(u.toolCallId, merged);
        if (u.status && u.status !== prev.status && (u.status === 'completed' || u.status === 'failed'))
          log('tool_done', { id: u.toolCallId, title: merged.title, status: u.status });
        break;
      }
      case 'plan': log('plan', { entries: (u.entries || []).map(e => `[${e.status}] ${e.content}`) }); break;
      case 'current_mode_update':
        if (state.config?.mode) state.config.mode.current = u.currentModeId;
        log('config', { configId: 'mode', value: u.currentModeId });
        break;
      case 'user_message_chunk':
      case 'available_commands_update': break;
      default: log('update', { kind: u.sessionUpdate });
    }
  };

  const onAgentRequest = async msg => {
    const p = msg.params || {};
    try {
      if (msg.method === 'session/request_permission') {
        const tc = { ...(toolCalls.get(p.toolCall?.toolCallId) || {}), ...p.toolCall };
        const opt = await requestPermission(tc, p.options || []);
        if (opt?.kind?.startsWith('allow') && tc.kind === 'edit') for (const f of editPaths(tc)) approvedWrites.add(f);
        reply(msg.id, opt ? { outcome: { outcome: 'selected', optionId: opt.optionId } } : { outcome: { outcome: 'cancelled' } });
        return;
      }
      if (msg.method === 'fs/read_text_file') {
        let text = fs.readFileSync(p.path, 'utf8');
        if (p.line || p.limit) {
          const lines = text.split('\n');
          const start = Math.max(0, (p.line || 1) - 1);
          text = lines.slice(start, p.limit ? start + p.limit : undefined).join('\n');
        }
        reply(msg.id, { content: text });
        return;
      }
      if (msg.method === 'fs/write_text_file') {
        if (cfg.policy === 'read-only') return replyError(msg.id, -32000, 'write denied: session is read-only');
        if (cfg.policy !== 'yolo' && !inside(cfg.cwd, localPath(p.path))) return replyError(msg.id, -32000, `write denied: ${p.path} is outside ${cfg.cwd}`);
        // An agent may auto-approve its own edits and still write through the client, so the
        // policy applies here too, unless this file's edit was just approved as a permission.
        const key = pathKey(p.path);
        if (approvedWrites.has(key)) approvedWrites.delete(key);
        else {
          const tc = { title: `Write ${p.path}`, kind: 'edit', rawInput: { path: p.path, bytes: Buffer.byteLength(p.content || '') } };
          const opt = await requestPermission(tc, WRITE_OPTIONS);
          if (!opt?.kind?.startsWith('allow')) return replyError(msg.id, -32000, `write denied by the orchestrator: ${p.path}. Do not try to work around this denial.`);
        }
        fs.mkdirSync(path.dirname(localPath(p.path)), { recursive: true });
        fs.writeFileSync(localPath(p.path), p.content);
        log('fs_write', { path: p.path });
        reply(msg.id, {});
        return;
      }
      replyError(msg.id, -32601, `method not supported by client: ${msg.method}`);
    } catch (e) {
      replyError(msg.id, -32000, e.message);
    }
  };

  const onLine = line => {
    let msg;
    try { msg = JSON.parse(line); } catch { fs.writeSync(errFd, `[stdout] ${line}\n`); return; }
    if (msg.id != null && !msg.method) {
      const w = waiting.get(msg.id);
      if (!w) return;
      waiting.delete(msg.id);
      if (msg.error) {
        const err = new Error(msg.error.message || 'error');
        err.code = msg.error.code;
        err.data = msg.error.data;
        w.reject(err);
      } else w.resolve(msg.result);
    } else if (msg.method && msg.id != null) onAgentRequest(msg);
    else if (msg.method === 'session/update') onUpdate(msg.params?.update || {});
  };

  // Session titles: set in the agent's own session list where it supports renaming
  // (Devin: _cognition.ai/session/rename; OpenCode: PATCH /session/:id on its HTTP server).
  // Cursor has no rename, so its title lives only in the bridge.
  let agentMeta = {};
  const opencodeSessionUrl = () => `http://127.0.0.1:${state.agentHttpPort}/session/${state.sessionId}?directory=${encodeURIComponent(cfg.cwd)}`;
  const setNativeTitle = async title => {
    if (cfg.agent === 'devin' && agentMeta['cognition.ai/sessionRename']) {
      await request('_cognition.ai/session/rename', { sessionId: state.sessionId, title });
    } else if (cfg.agent === 'opencode' && state.agentHttpPort) {
      const r = await fetch(opencodeSessionUrl(), { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title }) });
      if (!r.ok) throw new Error(`opencode rename: HTTP ${r.status}`);
    } else return false;
    state.nativeTitle = title;
    return true;
  };

  return {
    async start() {
      await spawnAgent();
      const init = await request('initialize', {
        protocolVersion: 1,
        clientCapabilities: { fs: { readTextFile: true, writeTextFile: true }, terminal: false },
        clientInfo: { name: 'claude-acp-bridge', version: '0.1.0' },
      });
      state.agentInfo = init?.agentInfo;
      state.agentCapabilities = init?.agentCapabilities;
      agentMeta = init?.agentCapabilities?._meta || {};
      const newSession = async () => {
        if (!cfg.resume) return request('session/new', { cwd: cfg.cwd, mcpServers: [] });
        if (!init?.agentCapabilities?.loadSession) throw new Error(`${cfg.agent} does not support session/load; start a new session`);
        replaying = 1;
        try {
          const r = await request('session/load', { sessionId: cfg.resume, cwd: cfg.cwd, mcpServers: [] });
          log('resumed', { sessionId: cfg.resume, replayedUpdates: replaying - 1 });
          return { sessionId: cfg.resume, ...(r || {}) };
        } finally { replaying = 0; }
      };
      let sess;
      try {
        sess = await newSession();
      } catch (e) {
        if (!init?.authMethods?.length) throw e;
        log('auth', { methodId: init.authMethods[0].id, reason: e.message });
        await request('authenticate', { methodId: init.authMethods[0].id });
        sess = await newSession();
      }
      writeJson(path.join(sessDir(cfg.id), 'session.json'), { initialize: init, session: sess });
      state.sessionId = sess.sessionId;
      setOptions(sess.configOptions);
      if (!state.config.mode && sess.modes) state.config.mode = { current: sess.modes.currentModeId, values: sess.modes.availableModes.map(m => m.id) };
      if (!state.config.model && sess.models) state.config.model = { current: sess.models.currentModelId, values: sess.models.availableModels.map(m => m.modelId) };
      const mode = cfg.mode || DEFAULT_MODE[cfg.agent]?.[cfg.policy];
      if (mode) await setConfig('mode', mode);
      if (cfg.model) await setConfig('model', cfg.model);
    },
    async prompt(text) {
      return request('session/prompt', { sessionId: state.sessionId, prompt: [{ type: 'text', text }] });
    },
    cancel() { notify('session/cancel', { sessionId: state.sessionId }); },
    setConfig,
    setNativeTitle,
    // Agents may auto-title a session from its first prompt; put the canonical title back.
    async keepTitle() {
      if (!cfg.title || !state.nativeTitle) return;
      let current = state.nativeTitle;
      if (cfg.agent === 'opencode') {
        try { current = (await (await fetch(opencodeSessionUrl())).json()).title; } catch { return; }
      }
      if (current !== cfg.title) await setNativeTitle(cfg.title).catch(() => {});
    },
    shutdown(code) {
      if (child) killTree(child.pid);
      setTimeout(() => process.exit(code), 300);
    },
  };
}

// ---- agy driver: the Antigravity CLI has no ACP server. Each turn runs
// `agy -p <prompt> --output-format stream-json`, continuing the conversation by id. In print
// mode agy denies every shell command, so it runs with --dangerously-skip-permissions and the
// acp-bridge-gate PreToolUse hook (installed by `acp gate install`) sends each tool call to
// this daemon (POST /gate) for the same policy and approval flow as ACP permission requests.
const AGY_KINDS = {
  read: ['view_file', 'list_dir', 'list_permissions', 'list_resources', 'read_resource', 'command_status',
    'list_browser_pages', 'read_browser_page', 'capture_browser_console_logs', 'capture_browser_screenshot'],
  search: ['find_by_name', 'grep_search'],
  fetch: ['read_url_content', 'search_web'],
  think: ['finish', 'wait', 'wait_5_seconds', 'manage_task', 'ask_question', 'ask_permission', 'ask_custom_permission'],
  edit: ['write_to_file', 'replace_file_content', 'multi_replace_file_content', 'sed_file', 'notebook_edit'],
  execute: ['run_command', 'send_command_input', 'notebook_execution', 'execute_browser_javascript'],
};
const agyKind = name => Object.keys(AGY_KINDS).find(k => AGY_KINDS[k].includes(name)) || 'other';
const agyTarget = a => a.CommandLine ?? a.TargetFile ?? a.AbsolutePath ?? a.SearchPath ?? a.DirectoryPath ?? a.Url ?? a.Query ?? '';
const agyTitle = (name, a = {}) => `${name} ${agyTarget(a)}`.trim();
const GATE_OPTIONS = [
  { optionId: 'allow', kind: 'allow_once' },
  { optionId: 'allow-always', kind: 'allow_always' },
  { optionId: 'deny', kind: 'reject_once' },
];

function agyDriver({ cfg, state, log, save, errFd, requestPermission }) {
  const { cmd } = AGENTS.agy();
  let child = null;
  let cancelled = false;
  const alwaysAllowed = new Set(); // "tool:target" keys approved with --always

  const setConfig = async (configId, wanted) => {
    const opt = state.config?.[configId];
    if (!opt) throw new Error(`agy has no config option '${configId}' (options: ${Object.keys(state.config).join(', ')})`);
    opt.current = matchValue(opt.values, wanted, configId);
    log('config', { configId, value: opt.current });
    save();
    return opt.current;
  };

  return {
    async start() {
      const gate = gateStatus();
      if (!gate.installed || !gate.enabled) throw new Error('the Antigravity gate plugin is not installed and enabled; run: acp gate install');
      if (!gate.current) log('gate_outdated', { hint: 'run: acp gate install' });
      let models = [];
      try {
        models = execFileSync(cmd, ['models'], { encoding: 'utf8', timeout: 90000, windowsHide: true })
          .split(/\r?\n/).map(l => l.split('\t')[0].trim()).filter(l => l && !/^Fetching/i.test(l));
      } catch { /* the model list is optional */ }
      let version = '?';
      try { version = execFileSync(cmd, ['--version'], { encoding: 'utf8', timeout: 30000, windowsHide: true }).trim(); } catch { /* keep '?' */ }
      state.agentInfo = { name: 'agy', title: 'Antigravity CLI', version };
      state.sessionId = cfg.resume || null; // the conversation id arrives with the first turn
      state.config = {
        model: { current: null, values: models },
        mode: { current: 'default', values: ['default', 'accept-edits', 'plan'] },
        effort: { current: 'default', values: ['default', 'low', 'medium', 'high', 'max'] },
      };
      if (cfg.mode) await setConfig('mode', cfg.mode);
      if (cfg.model) await setConfig('model', cfg.model);
      if (cfg.resume) log('resumed', { sessionId: cfg.resume });
    },
    prompt(text) {
      if (text.length > 30000) return Promise.reject(new Error('agy takes the prompt on its command line, which Windows limits to ~32K characters; shorten the prompt'));
      return new Promise((resolve, reject) => {
        const c = state.config;
        const args = ['-p', text, '--output-format', 'stream-json', '--dangerously-skip-permissions'];
        if (state.sessionId) args.push('--conversation', state.sessionId);
        if (c.model.current) args.push('--model', c.model.current);
        if (c.mode.current !== 'default') args.push('--mode', c.mode.current);
        if (c.effort.current !== 'default') args.push('--effort', c.effort.current);
        args.push(...(cfg.agentArgs || []));
        cancelled = false;
        child = spawn(cmd, args, {
          cwd: cfg.cwd,
          env: { ...process.env, ACP_BRIDGE_GATE: `http://127.0.0.1:${state.port}/gate`, ACP_BRIDGE_TOKEN: cfg.token },
          stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
        });
        state.agentPid = child.pid;
        save();
        child.stderr.on('data', d => fs.writeSync(errFd, d));
        const seen = new Set();
        let result = null;
        readline.createInterface({ input: child.stdout }).on('line', line => {
          let m;
          try { m = JSON.parse(line); } catch { fs.writeSync(errFd, `[stdout] ${line}\n`); return; }
          if (m.event === 'init') {
            if (!state.sessionId && m.conversation_id) { state.sessionId = m.conversation_id; save(); }
            return;
          }
          if (m.event === 'result') { result = m.result; return; }
          const u = m.step_update;
          if (!u) return;
          if (u.step_type === 'agent_response' && u.text_delta) log('message', { text: u.text_delta });
          else if (u.step_type === 'tool') {
            const title = agyTitle(u.tool_name, u.tool_info?.parameters);
            if (!seen.has(u.step_index)) { seen.add(u.step_index); log('tool_call', { id: u.step_index, title, kind: agyKind(u.tool_name) }); }
            if (u.state === 'DONE' || u.state === 'ERROR')
              log('tool_done', { id: u.step_index, title, status: u.state === 'DONE' ? 'completed' : 'failed', ...(u.tool_info?.error ? { error: String(u.tool_info.error.message).slice(0, 300) } : {}) });
          }
        });
        child.on('error', reject);
        child.on('close', code => {
          child = null;
          if (result) {
            if (!state.sessionId && result.conversation_id) state.sessionId = result.conversation_id;
            resolve({ stopReason: result.status === 'SUCCESS' ? 'end_turn' : String(result.status).toLowerCase(), denied: (result.denied_actions || []).map(d => d.action) });
          } else if (cancelled) resolve({ stopReason: 'cancelled' });
          else reject(new Error(`agy exited (code ${code}) without a result; see stderr.log`));
        });
      });
    },
    cancel() { if (child) { cancelled = true; killTree(child.pid); } },
    setConfig,
    async setNativeTitle() { return false; }, // agy has no conversation rename
    async keepTitle() {},
    // Called by the gate hook for every tool call; resolves to agy's hook decision.
    async gate(input) {
      const name = input.toolCall?.name || 'unknown';
      const a = input.toolCall?.args || {};
      if (input.modelName && state.config && !state.config.model.current) { state.config.model.current = input.modelName; save(); }
      const kind = agyKind(name);
      const tc = { title: agyTitle(name, a), kind, rawInput: a };
      // Edits outside the working directory never auto-allow, as with client writes over ACP.
      const target = a.TargetFile ?? a.AbsolutePath;
      if (kind === 'edit' && target && cfg.policy !== 'yolo' && !inside(cfg.cwd, target)) tc.kind = 'other';
      const key = `${name}:${agyTarget(a)}`;
      if (alwaysAllowed.has(key)) {
        log('permission_auto', { title: tc.title, kind: tc.kind, input: a, decision: 'always' });
        return { decision: 'allow' };
      }
      const opt = await requestPermission(tc, GATE_OPTIONS);
      if (opt?.kind === 'allow_always') alwaysAllowed.add(key);
      if (opt?.kind?.startsWith('allow')) return { decision: 'allow' };
      return { decision: 'deny', reason: opt ? 'Denied by the orchestrator (acp bridge policy or owner decision). Do not try to work around this denial.' : 'The turn was cancelled.' };
    },
    shutdown(code) {
      if (child) killTree(child.pid);
      setTimeout(() => process.exit(code), 300);
    },
  };
}

// ---------------------------------------------------------------- agy gate plugin

// The gate is an Antigravity plugin: ~/.gemini/config/plugins/acp-bridge-gate, enabled in
// ~/.gemini/config/config.json. Outside the bridge it answers nothing, so agy is unchanged.
const GATE_NAME = 'acp-bridge-gate';
const GATE_FILES = ['plugin.json', 'hooks.json', 'gate.mjs'];
const GATE_SRC = path.join(path.dirname(SELF), '..', 'agy-gate');
const GEMINI_CONFIG = path.join(os.homedir(), '.gemini', 'config');
const GATE_DST = path.join(GEMINI_CONFIG, 'plugins', GATE_NAME);
const GEMINI_CONFIG_JSON = path.join(GEMINI_CONFIG, 'config.json');

const fileHash = f => { try { return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'); } catch { return null; } };

function gateStatus() {
  const installed = GATE_FILES.every(f => fs.existsSync(path.join(GATE_DST, f)));
  const enabled = readJson(GEMINI_CONFIG_JSON, {})?.plugins?.[GATE_NAME]?.enabled === true;
  const current = installed && GATE_FILES.every(f => fileHash(path.join(GATE_SRC, f)) === fileHash(path.join(GATE_DST, f)));
  return { installed, enabled, current, path: GATE_DST };
}

function gateInstall() {
  fs.mkdirSync(GATE_DST, { recursive: true });
  for (const f of GATE_FILES) fs.copyFileSync(path.join(GATE_SRC, f), path.join(GATE_DST, f));
  const conf = readJson(GEMINI_CONFIG_JSON, {});
  conf.plugins = { ...(conf.plugins || {}), [GATE_NAME]: { enabled: true } };
  writeJson(GEMINI_CONFIG_JSON, conf);
}

function gateUninstall() {
  fs.rmSync(GATE_DST, { recursive: true, force: true });
  const conf = readJson(GEMINI_CONFIG_JSON, null);
  if (conf?.plugins?.[GATE_NAME]) { delete conf.plugins[GATE_NAME]; writeJson(GEMINI_CONFIG_JSON, conf); }
}

// ---------------------------------------------------------------- rendering

function render(evts, { thoughts = false } = {}) {
  const out = [];
  let msg = '';
  let thinking = 0;
  const flush = () => {
    if (msg.trim()) out.push(`agent: ${msg.trim()}`);
    if (thinking) out.push(`  (thinking x${thinking})`);
    msg = ''; thinking = 0;
  };
  for (const e of evts) {
    if (e.type === 'message') { msg += e.text; continue; }
    if (e.type === 'thought') { if (thoughts) msg += `\n[thought] ${e.text}`; else thinking++; continue; }
    flush();
    switch (e.type) {
      case 'prompt': out.push(`== turn ${e.turn} prompt: ${e.text.length > 200 ? e.text.slice(0, 200) + '...' : e.text}`); break;
      case 'tool_call': out.push(`  > ${e.title || e.id} [${e.kind || 'other'}]`); break;
      case 'tool_done': out.push(`    ${e.status === 'completed' ? 'ok' : 'FAILED'}: ${e.title || e.id}`); break;
      case 'permission_auto': out.push(`    (auto-${e.decision}) ${e.title} [${e.kind}]`); break;
      case 'permission': out.push(`  ? PERMISSION req=${e.req}: ${e.title} [${e.kind}]${e.input ? ' ' + JSON.stringify(e.input).slice(0, 300) : ''}\n      options: ${e.options.join(', ')}`); break;
      case 'permission_answer': out.push(`    answered req=${e.req}: ${e.choice}`); break;
      case 'fs_write': out.push(`    wrote ${e.path}`); break;
      case 'plan': out.push(`  plan:\n${e.entries.map(x => '    ' + x).join('\n')}`); break;
      case 'turn_end': out.push(`== turn ${e.turn} ended: ${e.stopReason || 'error: ' + e.error}`); break;
      case 'ready': out.push(`ready (session ${e.sessionId})`); break;
      case 'error': out.push(`ERROR: ${e.message}`); break;
      case 'agent_exit': out.push(`agent exited (code ${e.code})`); break;
      case 'config': out.push(`  [${e.configId} = ${e.value}]`); break;
      default: out.push(`  [${e.type}]`);
    }
  }
  flush();
  return out.join('\n');
}

// ---------------------------------------------------------------- doctor

const VERSION_ARGS = { devin: ['version'], opencode: ['--version'], cursor: ['--version'], agy: ['--version'] };

async function doctor(flags) {
  let ok = true;
  const line = (good, label, detail) => { if (good === false) ok = false; console.log(`${good === false ? 'FAIL' : good === null ? 'skip' : ' ok '}  ${label.padEnd(10)} ${detail}`); };
  const major = Number(process.versions.node.split('.')[0]);
  line(major >= 20, 'node', `${process.version}${major >= 20 ? '' : ' (need >= 20)'}`);
  try { line(true, 'git', execFileSync('git', ['--version'], { encoding: 'utf8' }).trim()); } catch { line(false, 'git', 'not found (needed for --worktree)'); }
  let found = 0;
  for (const name of Object.keys(AGENTS)) {
    let r;
    try { r = AGENTS[name](); } catch (e) { line(null, name, `not installed (${e.message})`); continue; }
    found++;
    const vArgs = name === 'cursor' && r.args.length > 1 ? [r.args[0], ...VERSION_ARGS.cursor] : VERSION_ARGS[name];
    let ver = '?';
    try { ver = execFileSync(r.cmd, vArgs, { encoding: 'utf8', timeout: 30000, env: { ...process.env, ...r.env }, windowsHide: true }).trim().split(/\r?\n/).pop(); } catch { /* keep '?' */ }
    let hs = '';
    if (flags.handshake && name !== 'agy') {
      const t0 = Date.now();
      hs = await new Promise(resolve => {
        const c = spawn(r.cmd, r.args, { env: { ...process.env, ...r.env }, stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true });
        const done = msg => { try { IS_WIN ? execFileSync('taskkill', ['/pid', String(c.pid), '/T', '/F'], { stdio: 'ignore' }) : c.kill(); } catch {} resolve(msg); };
        const timer = setTimeout(() => done('ACP handshake timed out (180s)'), 180000);
        readline.createInterface({ input: c.stdout }).on('line', l => {
          try { const m = JSON.parse(l); if (m.id === 1) { clearTimeout(timer); done(m.error ? `ACP error: ${m.error.message}` : `ACP ok in ${((Date.now() - t0) / 1000).toFixed(1)}s`); } } catch {}
        });
        c.on('error', e => { clearTimeout(timer); done(`spawn failed: ${e.message}`); });
        c.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: 1, clientCapabilities: {} } }) + '\n');
      });
      if (!hs.startsWith('ACP ok')) ok = false;
    }
    line(true, name, `${ver}  ${r.cmd}${hs ? '  | ' + hs : ''}`);
    if (name === 'agy') {
      const g = gateStatus();
      const good = g.installed && g.enabled;
      line(good ? true : false, 'agy gate', good ? `installed${g.current ? '' : ' but outdated (run: acp gate install)'}  ${g.path}` : 'not installed; agy sessions need it (run: acp gate install)');
    }
  }
  if (!found) { ok = false; console.log('FAIL  no agent found: install at least one of devin, opencode, cursor-agent, agy'); }
  console.log(`sessions dir: ${HOME}`);
  if (!ok) process.exitCode = 1;
}

// ---------------------------------------------------------------- CLI

function parseArgs(argv) {
  const pos = [], flags = {}, passthrough = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') { passthrough.push(...argv.slice(i + 1)); break; }
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      if (v !== undefined) flags[k] = v;
      else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) flags[k] = argv[++i];
      else flags[k] = true;
    } else pos.push(a);
  }
  return { pos, flags, passthrough };
}

const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function cmdStart({ pos, flags, passthrough }) {
  const agent = pos[0];
  if (!AGENTS[agent]) throw new Error(`agent must be one of: ${Object.keys(AGENTS).join(', ')}`);
  if (agent === 'agy') {
    const g = gateStatus();
    if (!g.installed || !g.enabled) throw new Error('agy sessions need the Antigravity gate plugin, which routes every agy tool call through the bridge; run: acp gate install');
  }
  const id = flags.name || `${agent}-${crypto.randomBytes(2).toString('hex')}`;
  if (fs.existsSync(sessDir(id)) && alive(readJson(path.join(sessDir(id), 'state.json'), {}).pid))
    throw new Error(`session '${id}' already running`);
  const prev = { cfg: readJson(path.join(sessDir(id), 'config.json'), {}), state: readJson(path.join(sessDir(id), 'state.json'), {}) };
  const resume = flags.resume === true ? prev.state.sessionId : flags.resume;
  if (flags.resume === true && !resume) throw new Error(`--resume: no previous agent session recorded for '${id}'`);
  // A resumed session keeps its previous settings unless they are overridden.
  const inherit = resume && prev.cfg.agent === agent ? prev.cfg : {};
  const policy = flags.policy || inherit.policy || 'ask';
  if (!POLICIES.includes(policy)) throw new Error(`policy must be one of: ${POLICIES.join(', ')}`);
  let cwd = path.resolve(flags.cwd || process.cwd());
  if (inherit.cwd && !flags.cwd && !flags.worktree) cwd = inherit.cwd;

  if (flags.worktree) {
    const wt = flags.worktree === true ? id : flags.worktree;
    const root = git(cwd, 'rev-parse', '--show-toplevel');
    const wtPath = path.join(path.dirname(root), `${path.basename(root)}.worktrees`, wt);
    if (!fs.existsSync(wtPath)) git(root, 'worktree', 'add', '-b', `acp/${wt}`, wtPath, flags.base || 'HEAD');
    cwd = wtPath;
  }

  fs.mkdirSync(sessDir(id), { recursive: true });
  for (const f of ['events.jsonl', 'stderr.log', 'state.json']) fs.rmSync(path.join(sessDir(id), f), { force: true });
  writeJson(path.join(sessDir(id), 'config.json'), {
    id, agent, cwd, policy, resume,
    mode: flags.mode || inherit.mode, model: flags.model || inherit.model,
    title: flags.title || prev.cfg.title,
    agentArgs: passthrough.length ? passthrough : inherit.agentArgs || [],
    token: crypto.randomBytes(16).toString('hex'), worktree: !!flags.worktree || !!inherit.worktree,
    created: new Date().toISOString(),
  });
  spawn(process.execPath, [SELF, '__daemon', id], { detached: true, stdio: 'ignore', windowsHide: true }).unref();

  const deadline = Date.now() + Number(flags.timeout || 120) * 1000;
  while (Date.now() < deadline) {
    await sleep(500);
    const st = readJson(path.join(sessDir(id), 'state.json'), {});
    if (st.status === 'idle') {
      console.log(`started ${id}  agent=${agent} (${st.agentInfo?.name || '?'} ${st.agentInfo?.version || ''})  policy=${policy}`);
      console.log(`cwd: ${cwd}`);
      for (const [k, o] of Object.entries(st.config || {}))
        console.log(`${k}: ${o.current}  (${o.values.length} values: acp options ${id})`);
      const title = readJson(path.join(sessDir(id), 'config.json'), {}).title;
      if (title) console.log(`title: "${title}"${st.nativeTitle === title ? '' : ' (bridge only: this agent cannot rename sessions)'}`);
      if (agent === 'agy') console.log(`note: agy runs one process per turn; every tool call goes through the acp-bridge-gate hook and the '${policy}' policy.`);
      if (agent === 'cursor' && st.config?.mode?.current === 'agent' && policy !== 'yolo')
        console.log(`note: cursor's 'agent' mode applies file edits without asking; only shell commands reach the '${policy}' policy. Use a worktree.`);
      return;
    }
    if (st.status === 'error' || st.status === 'exited') {
      const err = fs.readFileSync(path.join(sessDir(id), 'stderr.log'), 'utf8').slice(-1500);
      throw new Error(`failed to start ${id}: ${st.error || st.status}\n--- agent stderr (tail) ---\n${err}`);
    }
  }
  throw new Error(`timed out waiting for ${id} to start; check ${sessDir(id)}\\stderr.log`);
}

async function cmdWait(id, flags, since) {
  const deadline = Date.now() + Number(flags.timeout || 540) * 1000;
  let st;
  while (true) {
    st = await api(id, 'GET', '/status');
    if (!st.busy || st.pendingRequests.length || Date.now() > deadline) break;
    await sleep(1000);
  }
  const from = since ?? (flags.since != null ? Number(flags.since) : st.lastPromptSeq);
  const evts = await api(id, 'GET', `/events?since=${from}`);
  console.log(render(evts, { thoughts: !!flags.thoughts }));
  const why = st.pendingRequests.length ? 'awaiting_permission' : st.busy ? 'still working (timeout reached; run wait again)' : 'idle';
  console.log(`-- ${id}: ${why}  (seq=${st.seq})`);
  if (st.pendingRequests.length) console.log(`   answer with: acp approve ${id} <req> [--always]  |  acp deny ${id} <req>`);
}

const HELP = `acp - drive coding agents (devin | opencode | cursor over ACP, agy via its gate hook) from the shell

  acp start <agent> [--name ID] [--title TEXT] [--cwd DIR] [--worktree [NAME]] [--base REF]
                    [--resume [AGENT_SESSION_ID]]   (reload a stopped session's history; bare flag = last one for --name)
                    [--policy ask|edits|read-only|yolo] [--mode M] [--model M] [-- agent args]
  acp prompt <id> <text...> [--file F] [--wait] [--timeout SEC]
  acp wait <id> [--since SEQ] [--timeout SEC] [--thoughts]
  acp events <id> [--since SEQ] [--thoughts] [--raw]
  acp status <id>            acp list [--json]            acp doctor [--handshake]
  acp approve <id> <req> [--always] [--option OPTION_ID]
  acp deny <id> <req>        acp cancel <id>
  acp options <id> [filter]  list config options (mode, model, ...) and their values
  acp title <id> <text>      set the session title (also in the agent's own list for devin and opencode)
  acp mode <id> <value>      acp model <id> <value>       acp set <id> <configId> <value>
                             (values match by unique substring, e.g. 'glm-5.2')
  acp stop <id> [--remove-worktree]
  acp gate install|status|uninstall   the Antigravity plugin that routes agy tool calls through the bridge

policies (also mapped onto each agent's native permission settings):
  ask        auto-allow read/search/think/fetch; everything else waits for approve/deny (default)
  edits      like ask, but file edits are auto-allowed
  read-only  auto-allow reads, auto-deny everything else, block client file writes
  yolo       allow everything
`;

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === '__daemon') return daemon(rest[0]);
  const a = parseArgs(rest);
  const id = a.pos[0];
  switch (cmd) {
    case 'start': return cmdStart(a);
    case 'prompt': {
      const text = a.flags.file ? fs.readFileSync(a.flags.file, 'utf8') : a.pos.slice(1).join(' ');
      if (!text) throw new Error('empty prompt');
      const r = await api(id, 'POST', '/prompt', { text });
      if (a.flags.wait) return cmdWait(id, a.flags, r.since);
      return console.log(`turn ${r.turn} started on ${id} (events since seq ${r.since}); use: acp wait ${id}`);
    }
    case 'wait': return cmdWait(id, a.flags);
    case 'events': {
      const evts = await api(id, 'GET', `/events?since=${a.flags.since || 0}`);
      return console.log(a.flags.raw ? evts.map(e => JSON.stringify(e)).join('\n') : render(evts, { thoughts: !!a.flags.thoughts }));
    }
    case 'status': {
      const st = await api(id, 'GET', '/status');
      delete st.agentCapabilities;
      return console.log(JSON.stringify(st, null, 2));
    }
    case 'options':
    case 'models': {
      const st = await api(id, 'GET', '/status');
      const filter = (a.pos[1] || '').toLowerCase();
      for (const [k, o] of Object.entries(st.config || {})) {
        console.log(`${k}: ${o.current}`);
        o.values.filter(v => v.toLowerCase().includes(filter)).forEach(v => console.log(`  ${v === o.current ? '*' : ' '} ${v}`));
      }
      return;
    }
    case 'set': {
      const r = await api(id, 'POST', '/config', { configId: a.pos[1], value: a.pos.slice(2).join(' ') });
      return console.log(`${a.pos[1]} -> ${r.value}`);
    }
    case 'approve':
    case 'deny': {
      const decision = cmd === 'deny' ? 'deny' : a.flags.always ? 'always' : 'allow';
      const r = await api(id, 'POST', '/permission', { req: a.pos[1], decision, optionId: a.flags.option });
      return console.log(`req ${a.pos[1]} -> ${r.choice}`);
    }
    case 'cancel': await api(id, 'POST', '/cancel'); return console.log(`cancelled current turn on ${id}`);
    case 'title': {
      const r = await api(id, 'POST', '/title', { title: a.pos.slice(1).join(' ') });
      return console.log(`title -> ${a.pos.slice(1).join(' ')}${r.native ? '' : ' (bridge only: this agent cannot rename sessions)'}`);
    }
    case 'mode':
    case 'model': {
      const r = await api(id, 'POST', '/config', { configId: cmd, value: a.pos.slice(1).join(' ') });
      return console.log(`${cmd} -> ${r.value}`);
    }
    case 'stop': {
      const { cfg, state } = loadSession(id);
      if (alive(state.pid)) await api(id, 'POST', '/stop').catch(() => {});
      for (let i = 0; i < 50 && alive(state.pid); i++) await sleep(100);
      console.log(`stopped ${id}`);
      if (a.flags['remove-worktree'] && cfg.worktree) {
        await sleep(800);
        const root = git(cfg.cwd, 'rev-parse', '--path-format=absolute', '--git-common-dir').replace(/[\\/]\.git$/, '');
        git(root, 'worktree', 'remove', '--force', cfg.cwd);
        console.log(`removed worktree ${cfg.cwd} (branch kept)`);
      }
      return;
    }
    case 'list': {
      if (!fs.existsSync(HOME)) return console.log(a.flags.json ? '[]' : 'no sessions');
      const rows = [];
      for (const s of fs.readdirSync(HOME)) {
        const cfg = readJson(path.join(HOME, s, 'config.json'), {});
        const st = readJson(path.join(HOME, s, 'state.json'), {});
        const status = st.pid && alive(st.pid) ? st.status : 'dead';
        rows.push({
          id: s, agent: cfg.agent, status, policy: cfg.policy, title: cfg.title || '',
          nativeTitle: st.nativeTitle ?? null,
          model: st.config?.model?.current ?? null, mode: st.config?.mode?.current ?? null,
          sessionId: st.sessionId || '', cwd: cfg.cwd,
        });
      }
      if (a.flags.json) return console.log(JSON.stringify(rows, null, 2));
      for (const r of rows)
        console.log(`${r.id.padEnd(24)} ${String(r.agent).padEnd(9)} ${String(r.status).padEnd(19)} ${String(r.policy).padEnd(9)} model=${r.model ?? '?'} mode=${r.mode ?? '-'}  ${r.title ? `"${r.title}"${r.nativeTitle === r.title ? '' : ' (bridge only)'} ` : ''}${r.cwd}  [${r.sessionId}]`);
      return;
    }
    case 'doctor': return doctor(a.flags);
    case 'gate': {
      const sub = a.pos[0] || 'status';
      if (sub === 'install') gateInstall();
      else if (sub === 'uninstall') { gateUninstall(); return console.log(`removed ${GATE_DST} and its config.json entry`); }
      else if (sub !== 'status') throw new Error('usage: acp gate install|status|uninstall');
      const g = gateStatus();
      return console.log(`acp-bridge-gate: ${g.installed ? 'installed' : 'not installed'}, ${g.enabled ? 'enabled' : 'disabled'}${g.installed && !g.current ? ', outdated' : ''}  (${g.path})`);
    }
    default: return console.log(HELP);
  }
}

main().catch(e => { console.error(`error: ${e.message}`); process.exit(1); });
