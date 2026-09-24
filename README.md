# Approval-Gated Orchestrator

Installable plugins for approval-gated, cost-aware project orchestration, for **Claude Code** and **Codex**. The orchestrator prepares a frozen executor prompt, routes it to the cheapest capable lane, waits for the owner's approval before dispatching, gates what the executor may do, and verifies the report independently.

| Platform | Plugin directory | Marketplace manifest |
|---|---|---|
| Claude Code | [`plugins/claude-code`](plugins/claude-code) | [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json) |
| Codex | [`plugins/approval-gated-orchestrator`](plugins/approval-gated-orchestrator) | [`.agents/plugins/marketplace.json`](.agents/plugins/marketplace.json) |

# Claude Code

## Included

- `/approval-gated-orchestrator:orchestrate`: plans, routes, and dispatches one bounded task at a time, then verifies the report. Executors are Claude Code subagents or **Devin, OpenCode and Cursor agents driven over ACP** (Agent Client Protocol).
- `/approval-gated-orchestrator:model-routing-refresh`: refreshes a user- or project-owned copy of the dated routing guide when explicitly authorized.
- `/approval-gated-orchestrator:setup`: checks Node.js, git, and the agent CLIs, and explains how to fix what's missing.
- `acp` (`scripts/acp.mjs`, with `bin/acp` and `bin/acp.cmd` shortcuts): a dependency-free Node.js ACP client. The skills call it through `${CLAUDE_PLUGIN_ROOT}`, so it works whether or not the plugin's `bin/` is on `PATH`. It starts agent sessions (optionally in git worktrees), sends prompts, streams tool calls, and lets the orchestrator approve or deny each permission request.

## Install

Requirements: Claude Code, Node.js 20+, and git. The installers check them, add this repository as a plugin marketplace, install the plugin, and report which agents are available:

```powershell
./install.ps1            # Windows, from GitHub
./install.ps1 -Local     # Windows, from this clone
```

```bash
./install.sh             # macOS / Linux, from GitHub
./install.sh --local     # macOS / Linux, from this clone
```

Or install manually from inside Claude Code:

```text
/plugin marketplace add fabricefoy/approval-gated-orchestrator-plugin
/plugin install approval-gated-orchestrator@approval-gated-orchestrator
```

Start a new session after installing. The agent CLIs are optional and are **never installed by this plugin**. Each has its own login and billing: [Devin](https://docs.devin.ai), [OpenCode](https://opencode.ai/docs), [Cursor CLI](https://cursor.com/cli). Claude Code subagent lanes work without any of them.

## Use

```text
/approval-gated-orchestrator:orchestrate Add input validation to the export command. Prepare the executor prompt; do not dispatch until I approve.
```

Executors are titled `<RoleCode>|<Model> [<Reasoning>]|<Route>|<Platform>`, for example `E|GLM 5.2 [High]|Ollama|OpenCode`. Before creating an executor, the orchestrator reuses a running or stopped session with the same identity (`acp start --resume` reloads a stopped agent's history).

ACP permission policies: `read-only` (advisors, reviews), `ask` (default; edits and commands wait for the orchestrator, which approves only what the frozen prompt authorizes and escalates the rest to you), `edits`, and `yolo`. Per-agent caveats are documented in [`acp-lanes.md`](plugins/claude-code/skills/orchestrate/references/acp-lanes.md). The main one: Cursor applies file edits without asking, so Cursor executors always get a worktree.

## Validate

```bash
claude plugin validate plugins/claude-code --strict
claude plugin validate . --strict
node plugins/claude-code/scripts/acp.mjs doctor --handshake
```

# Codex

## Included

- `$approval-gated-orchestrator`: prepares frozen executor prompts, selects a route, reuses matching tasks, and verifies reports.
- `$model-routing-refresh`: refreshes a user- or project-owned copy of the dated routing guide when explicitly authorized.
- A bundled routing snapshot and operating framework, so installation has no required external files.

Codex task APIs are native to Codex. CodexBar, Ollama, OpenCode, Devin, Oracle, and Claude Companion are optional integrations and are never installed or configured by this plugin. When CodexBar is unavailable, live provider usage is reported as unknown.

## Optional CodexBar integration

CodexBar is deliberately not bundled. It is a separately versioned app and CLI with platform-specific releases and provider authentication, so vendoring it would increase maintenance risk and could accidentally package local provider configuration. Install it separately from the official [CodexBar project](https://github.com/steipete/CodexBar#install) and follow its [CLI configuration guide](https://github.com/steipete/CodexBar/blob/main/docs/cli-configuration.md).

When `codexbar` is already installed and configured, the skill may read provider usage with commands such as:

```bash
codexbar usage --provider ollama --format json
```

The plugin never reads, copies, or packages CodexBar configuration, API keys, OAuth data, browser cookies, or provider tokens. If the CLI or a requested provider reading is unavailable, usage remains unknown.

## Install from GitHub

After publishing this directory as a GitHub repository:

```bash
codex plugin marketplace add OWNER/REPOSITORY --ref main
codex plugin add approval-gated-orchestrator@approval-gated-orchestrator
```

Start a new Codex task after installation so the bundled skills are discovered.

## Install from a local clone

```bash
codex plugin marketplace add /absolute/path/to/approval-gated-orchestrator-plugin
codex plugin add approval-gated-orchestrator@approval-gated-orchestrator
```

## Use

```text
Use $approval-gated-orchestrator to inspect this project and prepare the next executor prompt. Do not dispatch until I approve it.
```

The canonical task-title formats are:

```text
⭐O|<Model> [<Reasoning>]|<Route>|<Platform>
💡A|<Model> [<Reasoning>]|<Route>|<Platform>
E|<Model> [<Reasoning>]|<Route>|<Platform>
R|<Model> [<Reasoning>]|<Route>|<Platform>
```

Role codes are `O` Orchestrator, `E` Executor, `A` Advisor, and `R` Review. `⭐` is mandatory immediately before `O`, and `💡` is mandatory immediately before `A`; executor and review titles have no emoji prefix. Project identity remains part of duplicate detection but is omitted from the visible title. A missing marker on a legacy matching task does not justify a duplicate; reuse and rename it when possible.

On the Codex platform, an executor is always a user-visible Codex task that is reused or created with the canonical title after dispatch approval. Internal subagents may support read-only orchestration analysis, but they never substitute for the named executor task.

Each approved Codex prompt carries the orchestrator task and host IDs. On success or blocker, the executor sends its complete report back with `send_message_to_thread` before posting the same report as its own final response. The callback is evidence, not owner authorization. The orchestrator returns after confirming dispatch; `wait_threads` and `read_thread` are recovery tools, not routine polling.

## Add Ollama models to Codex

For the Codex macOS app, follow Ollama's official [ChatGPT Desktop integration guide](https://docs.ollama.com/integrations/chatgpt). This is the app integration path that makes Ollama models available alongside Codex's native OpenAI models.

Requirements and setup:

- Use Ollama v0.34.0 or newer.
- In the Ollama desktop app, open `Apps > ChatGPT (Desktop)` and turn it on.
- Follow the prompts and restart the ChatGPT desktop app when requested.
- Open ChatGPT desktop in Codex mode.
- In Ollama, open `Settings > Apps > ChatGPT` and choose up to five compatible local or cloud models.

The selected Ollama models then appear in Codex's model picker alongside the native models. Only requests using an Ollama model route through Ollama; regular Chat and voice use their usual providers, as do native Codex models.

The separate [Codex CLI integration guide](https://docs.ollama.com/integrations/codex) applies to terminal-based Codex setup and is not the macOS app model-picker path described above.

This plugin does not install Ollama, start its service, sign in, or change Codex or Ollama configuration automatically.

## Development validation

From this repository, validate the plugin with the `validate_plugin.py` script bundled with Codex's `plugin-creator` system skill. Validate each bundled skill with `quick_validate.py` from the `skill-creator` system skill.

Before committing or publishing, inspect the exact staged files and run an available secret scanner. Never add CodexBar configuration from `~/.config/codexbar/config.json` or `~/.codexbar/config.json`. Public GitHub repositories receive automatic secret scanning; enable push protection as an additional pre-push gate.

## License

MIT
