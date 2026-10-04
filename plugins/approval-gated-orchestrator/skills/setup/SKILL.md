---
name: setup
description: Check the local external-agent execution lanes bundled with Approval-Gated Orchestrator, including Node.js, git, Devin, OpenCode, Cursor, Antigravity, and optional CodexBar.
---

# External Agent Setup

Use the bundled ACP bridge to diagnose; do not install software, sign in, change provider configuration, or install the Antigravity gate without the owner's approval.

Resolve the active installed plugin root (the directory containing `.codex-plugin/plugin.json`) rather than using a source checkout path. Codex installs plugins under `$CODEX_HOME/plugins/cache/`, or `~/.codex/plugins/cache/` by default. `PLUGIN_ROOT` is documented for plugin hook commands but may not be exported in a skill shell. On macOS/Linux, resolve it with:

```bash
PLUGIN_ROOT="${PLUGIN_ROOT:-$(find "${CODEX_HOME:-$HOME/.codex}/plugins/cache" -type f -path '*/approval-gated-orchestrator/*/.codex-plugin/plugin.json' -print -quit | sed 's#/.codex-plugin/plugin.json$##')}"
test -n "$PLUGIN_ROOT" || { echo "approval-gated-orchestrator plugin root not found" >&2; exit 1; }
node "$PLUGIN_ROOT/scripts/acp.mjs" doctor
```

In the commands below, `acp` means `node "$PLUGIN_ROOT/scripts/acp.mjs"`.

This checks Node.js, git, optional CodexBar, and available agent CLIs without provider handshakes. The Antigravity gate is required only for the native `agy` lane. A missing gate does not make Devin, OpenCode, or Cursor unavailable. Use `acp doctor --handshake` only when a protocol handshake is specifically needed and approved; it starts installed agent ACP servers and may take several minutes.

Report each component as available, unavailable, or optional, and explain what the lane enables. For missing components, give the official setup source and stop; do not install or authenticate them. To inspect live usage without starting a model turn, use `acp usage --json`. Report unmeasured usage as unknown, never zero. See the approval-gated-orchestrator skill's [ACP bridge reference](../approval-gated-orchestrator/references/acp-bridge.md) for session reuse, naming, permissions, prompt/wait, resume, and stop.
