# Bridge Lanes and Optional Integrations

Read this reference before evaluating or using a Devin, OpenCode, Cursor, Antigravity, Ollama, or advisor route.

## The `acp` bridge

`acp` is a dependency-free Node.js (20+) agent bridge, bundled at `scripts/acp.mjs` in this plugin. Invoke it as the skill defines (`node "<plugin root>/scripts/acp.mjs" ...`). Each session is a background daemon that exposes a token-protected HTTP API on `127.0.0.1`. For Devin, OpenCode and Cursor it owns the agent's ACP server over stdio; for Antigravity (`agy`) it runs one print-mode process per turn (see below). The agent runs in its own harness; the bridge only sends prompts, streams events, and answers permission requests. Session state lives in `~/.claude/acp-bridge/sessions/<id>/` (override with `ACP_HOME`): `config.json`, `state.json`, `events.jsonl`, `stderr.log`, `session.json`.

| Command | Purpose |
|---|---|
| `acp doctor [--handshake]` | Check Node, git, which agent CLIs are installed, and the Antigravity gate (`--handshake` also tests each ACP server; slow for OpenCode) |
| `acp start <agent> --name ID --title TITLE [--worktree] [--policy P] [--model M] [--mode M]` | Start a session; `agent` is `devin`, `opencode`, `cursor` or `agy` |
| `acp start <agent> --name ID --resume` | Reload a stopped session's history (`session/load`, or `--conversation` for agy); keeps its previous cwd, policy, model, and title |
| `acp gate install\|status\|uninstall` | Install, check or remove the Antigravity gate plugin that agy sessions require |
| `acp prompt <id> --file prompt.md` / `acp prompt <id> "text"` | Start a turn (returns immediately; add `--wait` to block) |
| `acp wait <id> [--timeout SEC]` | Block until the turn ends, a permission is pending, or timeout; prints the compact transcript |
| `acp approve <id> <req> [--always]` / `acp deny <id> <req>` | Answer a pending permission request |
| `acp list [--json]`, `acp status <id>`, `acp events <id> --since N` | Find sessions for reuse (with each session's live `model` and `mode`, title, and whether the title is also set in the agent's own list); inspect state and history |
| `acp title <id> <title>` | Rename a session, in the bridge and, for Devin and OpenCode, in the agent's own session list |
| `acp usage [--json] [--lanes L,..] [--days N]` | Usage per lane (CodexBar CLI first, then the provider's own method) plus per-session usage, without starting a model turn (see Live usage) |
| `acp options <id> [filter]`, `acp model <id> <value>`, `acp mode <id> <value>` | List and set the models and modes the agent exposes (values match by unique substring) |
| `acp cancel <id>`, `acp stop <id> [--remove-worktree]` | Cancel the running turn; stop the session (the `acp/<name>` branch is kept) |

`--worktree` creates `<repo>.worktrees/<name>` on branch `acp/<name>`, so parallel executors never share a checkout. It requires a git repository with at least one commit.

## Permission policies

| Policy | Reads | File edits | Shell and other tools | Use for |
|---|---|---|---|---|
| `read-only` | allow | deny | deny | advisors, reviews, analysis |
| `ask` (default) | allow | wait for the orchestrator | wait for the orchestrator | executors whose authority needs per-action judgment |
| `edits` | allow | allow | wait for the orchestrator | executors approved to edit owned files in a worktree |
| `yolo` | allow | allow | allow | only with explicit owner approval, in a disposable worktree |

Agents only ask the client about actions their own harness gates, so the bridge also maps each policy onto the agent's native settings and gates the file writes that agents route through it. The per-agent notes below record where that mapping is incomplete.

## Per-agent notes (verified 2026-09-28)

### Devin (`devin acp`)

- In its default `accept-edits` mode, Devin auto-approves edits it considers inside its workspace but writes them through the bridge (`fs/write_text_file`), where the policy applies: under `ask` the write waits for approval. Edits it considers outside the workspace arrive as permission requests; approving one also clears the matching write, so nothing is asked twice.
- Devin runs shell commands it classifies as read-only (for example `ls`, `pwd`) without asking; other commands arrive as permission requests.
- `read-only` switches Devin to its `ask` mode, which offers only read-only tools. `yolo` switches it to `bypass`.
- Exposes a large model catalog (for example `swe-2-max`, `claude-opus-5-*`); choose with `--model`. Supports `session/load`.
- Session titles are set natively through Devin's `_cognition.ai/session/rename` extension, so they appear in `devin list`.
- Local sessions still send context to Devin's model providers. Devin Cloud handoff (a separate product surface) moves the repository itself off-machine: inspect the exact transmitted state for secrets and unrelated changes and obtain explicit authorization first. If a surface does not expose the model or reasoning level, use a truthful managed label such as `E|Devin-managed|Devin Local`.

### OpenCode (`opencode acp`)

- The bridge injects `permission` settings through `OPENCODE_CONFIG_CONTENT`, so edits and bash commands ask the client. They are merged over the user's `opencode.json`.
- Modes come from the user's installed OpenCode agents and plugins (for example oh-my-openagent's Sisyphus or Prometheus); models come from its configured providers (Ollama Cloud, OpenCode Go, and others). Check both with `acp options`.
- OpenCode's ACP server has no rename method, so the bridge starts it with a known `--port` and sets titles through OpenCode's HTTP API (`PATCH /session/:id`). They appear in `opencode session list`.
- Startup can take one to two minutes when many plugins are configured, especially unpinned `@latest` ones. Start OpenCode sessions first. `-- --pure` skips external plugins (fast, but loses plugin-provided modes). Do not reconfigure the user's OpenCode setup without authorization.

### Cursor (`agent acp`, from the Cursor CLI)

- In its default `agent` mode, Cursor applies **file edits without asking the client**; only shell commands reach the permission gate. Edits can be blocked (`read-only` switches Cursor to its read-only `ask` mode, and `plan` is also read-only) but cannot be approved one at a time. Always give a Cursor executor a worktree.
- Cursor cannot rename sessions over ACP or its CLI, so a Cursor session's title exists only in the bridge (`acp list` marks it "bridge only").
- On Windows the bridge runs the CLI's bundled `node.exe index.js` directly, because the `.ps1` launcher breaks stdio piping.
- Cursor runs each shell command as `pwsh -NonInteractive -File %TEMP%\ps-script-<uuid>.ps1`, and several shells may start at the beginning of a turn. They load the user's PowerShell profile, so heavy profiles (for example `conda activate`) slow every command. Cursor does not delete these scripts, and some contain a full environment dump; tell the owner if secrets live in environment variables.

### Antigravity (`agy`, the Antigravity CLI)

- `agy` has no ACP server. Each turn runs `agy -p <prompt> --output-format stream-json`, continuing the conversation with `--conversation <id>`; the session id is that conversation id. The prompt travels on the command line, so keep it under about 30,000 characters (write long context to a file in the worktree and point to it).
- In print mode `agy` applies file edits without asking and denies every shell command, and its `plan` mode still writes files, so its own modes cannot enforce a policy. The bridge therefore runs it with `--dangerously-skip-permissions` and relies on the **acp-bridge-gate** plugin (`acp gate install` puts it in `~/.gemini/config/plugins/` and enables it). The gate is a PreToolUse hook: inside a bridge session it sends every tool call to the bridge, which applies the policy or holds it for `acp approve` / `acp deny`; if the bridge cannot be reached it denies. Outside the bridge it does nothing. `acp start agy` refuses to run without it.
- Tool kinds for the policies: reads and searches (`view_file`, `grep_search`, `read_url_content`, ...) are reads; `write_to_file`, `replace_file_content`, `multi_replace_file_content`, `sed_file` and `notebook_edit` are edits; `run_command`, `send_command_input`, `notebook_execution` and `execute_browser_javascript` are commands. Everything else (browser control, MCP calls, image generation, subagents, scheduling, messages) waits for the orchestrator under `ask` and `edits`. `acp approve --always` is remembered for the same tool and target for the rest of the session.
- Options: `model` (from `agy models`, for example `gemini-3.8-flash-high`, `gemini-3.1-pro-high`, `claude-opus-4-6-thinking`), `mode` (`default`, `accept-edits`, `plan`) and `effort` (`low` to `max`). They apply from the next turn.
- `agy` cannot rename conversations, so titles are bridge-only.
- A broken PreToolUse hook from another Antigravity plugin makes every agy tool call fail; `acp doctor` does not detect that, but the tool errors name the hook.

### Antigravity models through OpenCode

With the owner's OpenCode antigravity-auth plugin, OpenCode exposes models such as `google/antigravity-gemini-3.1-pro` and `google/antigravity-claude-opus-4-6-thinking`. Start an OpenCode session and select one with `--model`; title it with route `Antigravity` and platform `OpenCode`, for example `E|Gemini 3.1 Pro|Antigravity|OpenCode`. Approvals then follow the OpenCode notes above.

## Live usage

Rule: **the CodexBar CLI first, then each provider's own method.** `acp usage --json` applies it per lane and records where each figure came from (`source`: `codexbar` or `provider`), with a `checkedAt` timestamp. None of it starts a model turn.

1. **CodexBar CLI.** Found through `CODEXBAR_CLI` if set, otherwise on `PATH`: `codexbar-cli` on Windows (where `codexbar` is the tray app; the Windows installer's default folder is also checked), `codexbar` on macOS and Linux. The bridge asks it for each provider a lane can use, with `usage --provider <p> --format json`:

   | Lane | CodexBar providers |
   |---|---|
   | Claude Code | `claude` |
   | Cursor | `cursor` |
   | Devin | `devin` |
   | Antigravity (`agy`) | `antigravity` |
   | OpenCode | `opencodego`, `opencode`, `ollama`, `antigravity` (whichever serves the model) |

   It also asks for `codex` and reports it when available. A provider CodexBar is not set up for (not signed in, missing organization or key) comes back with CodexBar's error, and the lane falls through to step 2.
2. **The provider's own method**, only for lanes CodexBar did not report:
   - Claude Code: `claude -p /usage` (session and weekly limits).
   - Antigravity: `agy -p /usage --output-format stream-json` (remaining quota per model group).
   - Devin: `devin -p /usage`; some Devin versions support `/usage` only inside a session. If the lane is still unknown and a Devin session is running, send `/usage` in it (`acp prompt <id> "/usage" --wait`).
   - OpenCode: `opencode stats --days N --models`, OpenCode's local token and list-price cost estimates. These are not a provider quota.
   - Cursor: none. Cursor's CLI has no usage command, so only CodexBar can report it.
3. Otherwise the lane is **unknown**: never zero, and never routed as though it were free.

The check takes a few seconds when CodexBar reports every lane, and up to about a minute when provider fallbacks run. Setting a provider up in CodexBar (for example signing in Antigravity, or giving Devin its organization) makes that lane fast and consistent across machines.

Each bridge session also records its own usage, shown in `acp list` and under `sessions` in `acp usage`: tokens accumulated per turn for `agy`; cumulative tokens, cache, context and cost for OpenCode; context-window use (and Devin's per-call tokens in the JSON) for Devin. Cursor reports nothing per session.

Never read or print CodexBar's configuration, API keys, OAuth data, cookies or tokens, and do not install or configure CodexBar or any provider as a side effect of orchestration; suggest the setup to the owner instead.

## Ollama

Treat Ollama as a provider route, not as the execution platform. The same model is titled `E|GLM 5.3 Flash [High]|Ollama|OpenCode` when OpenCode runs it. Do not install Ollama, start its service, sign in, or alter its configuration without explicit authorization.

## Advisors

A second Claude subagent, a Devin `review` agent (`acp start devin -- --agent-type review`), Cursor in `ask` mode, or a manual advisor can act as an advisor. Keep advisory runs read-only (`--policy read-only`) unless the owner separately authorizes mutation, provider cost, or off-machine file transfer. Advisor output is verified against primary artifacts before use.
