# ACP Lanes and Optional Integrations

Read this reference before evaluating or using a Devin, OpenCode, Cursor, Ollama, or advisor route.

## The `acp` bridge

`acp` is a dependency-free Node.js (20+) client for the Agent Client Protocol, bundled at `scripts/acp.mjs` in this plugin. Invoke it as the skill defines (`node "<plugin root>/scripts/acp.mjs" ...`). Each session is a background daemon that owns one agent's `acp` server over stdio and exposes a token-protected HTTP API on `127.0.0.1`. The agent runs in its own harness; the bridge only sends prompts, streams events, and answers permission requests. Session state lives in `~/.claude/acp-bridge/sessions/<id>/` (override with `ACP_HOME`): `config.json`, `state.json`, `events.jsonl`, `stderr.log`, `session.json`.

| Command | Purpose |
|---|---|
| `acp doctor [--handshake]` | Check Node, git, and which agent CLIs are installed (`--handshake` also tests each ACP server; slow for OpenCode) |
| `acp start <agent> --name ID --title TITLE [--worktree] [--policy P] [--model M] [--mode M]` | Start a session; `agent` is `devin`, `opencode` or `cursor` |
| `acp start <agent> --name ID --resume` | Reload a stopped session's history (`session/load`); keeps its previous cwd, policy, model, and title |
| `acp prompt <id> --file prompt.md` / `acp prompt <id> "text"` | Start a turn (returns immediately; add `--wait` to block) |
| `acp wait <id> [--timeout SEC]` | Block until the turn ends, a permission is pending, or timeout; prints the compact transcript |
| `acp approve <id> <req> [--always]` / `acp deny <id> <req>` | Answer a pending permission request |
| `acp list [--json]`, `acp status <id>`, `acp events <id> --since N` | Find sessions for reuse (with each session's live `model` and `mode`, title, and whether the title is also set in the agent's own list); inspect state and history |
| `acp title <id> <title>` | Rename a session, in the bridge and, for Devin and OpenCode, in the agent's own session list |
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

Agents only ask the client about actions their own harness gates, so the bridge also maps each policy onto the agent's native settings. The per-agent notes below record where that mapping is incomplete.

## Per-agent notes (verified 2026-09-21)

### Devin (`devin acp`)

- Asks the client before edits and shell commands in its default `accept-edits` mode. `yolo` switches it to `bypass`.
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

## Live usage

CodexBar CLI is an optional external integration, not a plugin dependency. Point owners to the official [CodexBar project](https://github.com/steipete/CodexBar#install) and [CLI configuration guide](https://github.com/steipete/CodexBar/blob/main/docs/cli-configuration.md); do not vendor its binaries or configuration. Use it only when it is already installed and configured, with `codexbar usage --provider <provider> --format json`; do not install or configure it as an orchestration side effect. Never read or print its config, API keys, OAuth data, browser cookies, or provider tokens. A reliable native account-usage surface is equally valid. If no live reading is available, report usage as unknown. Never treat missing, ambiguous, or failed usage output as zero consumption or unlimited capacity.

## Ollama

Treat Ollama as a provider route, not as the execution platform. The same model is titled `E|GLM 5.3 Flash [High]|Ollama|OpenCode` when OpenCode runs it. Do not install Ollama, start its service, sign in, or alter its configuration without explicit authorization.

## Advisors

A second Claude subagent, a Devin `review` agent (`acp start devin -- --agent-type review`), Cursor in `ask` mode, or a manual advisor can act as an advisor. Keep advisory runs read-only (`--policy read-only`) unless the owner separately authorizes mutation, provider cost, or off-machine file transfer. Advisor output is verified against primary artifacts before use.
