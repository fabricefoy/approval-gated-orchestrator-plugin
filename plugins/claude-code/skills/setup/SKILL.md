---
name: setup
description: Check and set up the approval-gated orchestrator's execution lanes - Node.js, git, and the Devin, OpenCode and Cursor CLIs used over ACP. Use when the owner asks to set up, check, or troubleshoot the orchestrator or its agents.
disable-model-invocation: true
argument-hint: "[--handshake]"
---

# Orchestrator Setup

Diagnose first; change nothing without the owner's approval.

## 1. Diagnose

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/acp.mjs" doctor $ARGUMENTS`. Below, `acp` stands for `node "${CLAUDE_PLUGIN_ROOT}/scripts/acp.mjs"`. `--handshake` also starts each agent's ACP server and times the handshake (OpenCode can take a minute or two).

Report a table: component, status, version, and what it enables. At least one agent is needed for ACP lanes. Claude Code subagents work without any of them.

## 2. Explain the fixes, then stop for approval

For each FAIL or missing component, give the fix and ask before doing it:

| Component | Requirement | Where to get it |
|---|---|---|
| Node.js | 20 or newer | nodejs.org, or the OS package manager |
| git | any recent version; the repo needs one commit for `--worktree` | git-scm.com |
| Devin CLI | `devin` on `PATH`, logged in (`devin auth`) | Devin's official documentation (docs.devin.ai) |
| OpenCode | `opencode` on `PATH`, with at least one provider configured | opencode.ai/docs |
| Cursor CLI | `cursor-agent` or `agent` on `PATH`, logged in (`cursor-agent login`) | cursor.com/cli |

Fetch the current install command from the official page before running it; do not rely on a remembered one. Each CLI has its own login and billing, which the owner must set up. Never read, print, or copy credentials.

If the project is not a git repository and the owner wants worktree isolation, offer `git init` and an initial commit, after checking what the commit would include (large or generated files, secrets).

## 3. Verify

After any approved change, run `acp doctor` again. Optionally run a read-only smoke test on one agent, with the owner's approval, since it makes a small paid call:

```
acp start <agent> --name smoke-<agent> --policy read-only
acp prompt smoke-<agent> "Reply with the single word OK." --wait --timeout 180
acp stop smoke-<agent>
```

## Known environment issues

- OpenCode starts slowly with many plugins, especially unpinned `@latest` ones, and one invalid plugin entry logs an error at every start. Suggest pinning versions; `-- --pure` skips plugins for a session.
- Cursor (Windows) runs every shell command through the user's PowerShell profile and leaves `ps-script-*.ps1` files, some with environment dumps, in `%TEMP%`. A profile guard such as `if ([Environment]::GetCommandLineArgs() -contains '-NonInteractive') { return }` speeds it up, at the cost of profile setup (for example conda activation) in agent shells.
- On network drives (UNC paths), agent startup and worktree creation are noticeably slower.
