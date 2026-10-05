# External agents through the ACP bridge

The Codex plugin bundles one dependency-free Node.js 20+ ACP client at `scripts/acp.mjs`, with `bin/acp` and `bin/acp.cmd` launchers. Use the active installed plugin root, the directory containing `.codex-plugin/plugin.json`; do not use a checkout path. Codex installs plugins under `$CODEX_HOME/plugins/cache/` (`~/.codex/plugins/cache/` by default). `PLUGIN_ROOT` is documented for plugin hook commands, but may not be exported to a skill's shell command, so resolve it from the install cache when needed:

```bash
PLUGIN_ROOT="${PLUGIN_ROOT:-$(find "${CODEX_HOME:-$HOME/.codex}/plugins/cache" -type f -path '*/approval-gated-orchestrator/*/.codex-plugin/plugin.json' -print -quit | sed 's#/.codex-plugin/plugin.json$##')}"
test -n "$PLUGIN_ROOT" || { echo "approval-gated-orchestrator plugin root not found" >&2; exit 1; }
node "${PLUGIN_ROOT}/scripts/acp.mjs" doctor
```

In the commands below, `acp` means `node "${PLUGIN_ROOT}/scripts/acp.mjs"`. The bridge stores sessions in `$CODEX_HOME/acp-bridge/sessions/`, or `~/.codex/acp-bridge/sessions/` when `CODEX_HOME` is unset. Set `ACP_HOME` to override that directory. Each session contains its config, state, event log, stderr log, and agent session metadata. Do not inspect or print provider credentials.

## Setup and availability

Run `acp doctor` before choosing this lane. It checks Node.js, git, optional CodexBar, and installed agent CLIs without opening ACP handshakes. Run `acp doctor --handshake` only when explicitly needed; it starts each available ACP server for a protocol handshake and can take several minutes.

An unavailable CLI is an unavailable route, not a reason to install it. The Antigravity CLI (`agy`) has no ACP server and requires the separate `acp-bridge-gate` plugin for per-tool permission checks. If the gate is missing or disabled, treat only the native `agy` route as unavailable; other bridge lanes remain usable. The gate is included here and can be installed or checked with `acp gate install` and `acp gate status` when authorized. The gate install changes the user's Antigravity configuration, so ask before running it.

Run `acp usage --json` before comparing external lanes. The bridge asks CodexBar first, then uses provider-specific usage methods where available. A lane it cannot measure is `unknown`, never zero. `acp usage` does not start a model turn. CodexBar and provider CLIs are optional and are not installed or configured by the plugin.

## Session identity and reuse

Before starting an executor, inspect `acp list --json`, which includes running and stopped sessions, then match project, role, route/platform, exact live model, reasoning level when exposed, and task identity. Read `acp status <id>` and `acp options <id>` when list data does not establish the live model or mode. Reuse a matching running session; resume a matching stopped one. Do not create a duplicate while a match is busy.

Use the canonical visible title `E|<Model> [<Reasoning>]|<Route>|<Platform>` (or `A|...` for a read-only advisor). Use a filesystem-safe `--name` made from that title and a project slug so sessions from different projects do not collide. Pass the title to `--title`; Devin and OpenCode also receive it in their own session lists, while Cursor and Antigravity titles remain bridge-only. Use `acp title` to correct a title after an approved model or role change.

## Start, prompt, and wait

Start only after the owner approves the frozen prompt and its external route. Choose the CLI, policy, model, mode, and worktree from that approval. Example for an executor approved to edit in isolation:

```bash
acp start opencode --name E-model-route-project --title "E|Model [High]|Route|OpenCode" --cwd /path/to/project --worktree --policy ask --model "provider/model"
```

The `--worktree` option creates a separate `acp/<name>` branch and a sibling worktree. Give Cursor executors a worktree because Cursor can apply file edits without asking. Never use `yolo` without explicit owner approval. Check the reported cwd and live model before sending work.

Send the exact approved prompt from a file and wait for a bounded interval:

```bash
acp prompt E-model-route-project --file /path/to/frozen-prompt.md
acp wait E-model-route-project --timeout 540
```

`acp prompt` starts a turn and returns. `acp wait` prints events and reports `idle`, `awaiting_permission`, or still working. Repeat `acp wait` after a timeout; do not resend the prompt. The bridge has no verified automatic callback into Codex. An `acp wait` result is evidence about the external session, not a callback message and not owner authorization.

## Permission requests

Use the narrowest approved policy:

| Policy | Behavior |
|---|---|
| `read-only` | Allows reads; denies edits and other actions. Use for advisors and reviews. |
| `ask` | Allows reads; holds edits and commands for a decision. This is the default for executors. |
| `edits` | Allows edits; holds commands for a decision. Use only when the approved prompt authorizes edits. |
| `yolo` | Allows all actions. Use only with explicit owner approval in a disposable worktree. |

When `acp wait` reports a pending request, inspect `acp status <id>` and the exact requested action. Approve only a request clearly within the frozen prompt's file, worktree, command, and egress authority; use `acp approve <id> <req>`. Deny actions outside that authority with `acp deny <id> <req>`. Escalate ambiguous requests to the owner with the exact request and stop the external turn. `--always` extends an approval for that request's matching action in the session; use it only when that broader scope is explicitly authorized.

The ACP process sends repository context and prompts to the selected external agent/provider. Preserve the approved routing and egress decision; do not change provider, model, or task scope during a session without approval. OpenCode, Devin, Cursor, and `agy` keep their own logins and billing. The `devin-handoff` integration is a separate optional workflow and is not used by this local ACP bridge.

## Resume and stop

Resume only a matching stopped session after checking its saved model, mode, title, policy, and cwd:

```bash
acp start opencode --name E-model-route-project --resume
```

Resume reloads the saved agent conversation and inherits its previous settings unless explicitly overridden. Verify the resulting session state before sending the next prompt. If the agent does not support session loading, start a new approved session rather than silently dropping prior context.

After the task and verification are complete, stop the bridge daemon:

```bash
acp stop E-model-route-project
```

Stopping leaves its session records and any worktree in place. `--remove-worktree` removes the worktree and is a separate cleanup action that needs explicit authorization. The `acp/<name>` branch is retained. Do not merge or publish it without separate approval.
