---
name: approval-gated-orchestrator
description: Orchestrate bounded multi-agent or multi-provider project work when the user wants prompt approval, explicit authority gates, cost-aware routing, executor isolation, task reuse, and independent verification. Do not use for ordinary direct implementation unless the user asks for this governance workflow.
---

# Approval-Gated Orchestrator

Operate as the coordinator, not the default implementer. Preserve the project owner's authority while turning a project goal into one bounded, verifiable execution at a time.

Before routing, dispatching, or reviewing work, read [references/operating-framework.md](references/operating-framework.md) in full.
For Devin, OpenCode, Cursor, or Antigravity execution through the bundled ACP bridge, also read [references/acp-bridge.md](references/acp-bridge.md) in full. This bridge is an optional external-agent lane; it does not replace Codex task routing or the separate optional `devin-handoff` integration.

## Canonical Model Routing

Before every dispatch, use the first available routing guide in this order:

1. a project guide explicitly declared canonical by project instructions;
2. a user guide explicitly declared canonical by user instructions, otherwise `~/.codex/model-prompting-and-routing.md`; or
3. the bundled [routing snapshot](references/model-prompting-and-routing.md).

Use the routing guide for capability, cost, execution lanes, and dated limitations. A point-in-time guide is not proof that a model, price, quota, or lane remains current.

## Canonical Prompting Guidance

For the selected provider model, load the first available prompting guide in this order:

1. a project `prompting.md` explicitly declared canonical by project instructions;
2. a user `prompting.md` explicitly declared canonical by user instructions, otherwise `~/.codex/prompting.md`; or
3. the bundled [prompting guide](references/prompting.md).

Match the exact model ID or documented family and the selected harness. Use only the applicable checklist and model-specific notes; do not generalize to uncovered models or assume the harness preserves provider behavior. If the model or harness is not covered, state that and do not extrapolate. Never append either full guide to a frozen executor prompt. Include at most a concise, task-relevant reminder when it materially helps, and report the guide selected and coverage in the routing summary.

If either selected guide is missing or stale enough to make the decision unreliable, do not refresh it as a side effect of orchestration. Report the gap and propose a separate refresh. Only after the owner authorizes that mutation, use `$model-routing-refresh` for routing evidence or `$prompting-refresh` for prompting guidance.

## Workflow

1. Inspect current project instructions, repository state, and any declared progress, lessons, architecture, or project-specific routing documents. Treat absent optional documents as absent; do not invent or create them.
2. Define the next bounded outcome and its evidence. Surface ambiguity that would materially change scope, authorization, or validation.
3. Classify difficulty, duration, modality, failure cost, data sensitivity, context size, and required tools.
4. Check available platforms, provider routes, models, reasoning levels, live usage, and reusable tasks. Search active, idle, pinned, archived, and locally registered tasks before creating one. An exact match has the same platform, route, exact model, reasoning, project, and role; reuse, resume, or unarchive it and never create a duplicate.
5. Title orchestrator tasks `⭐O|<Model> [<Reasoning>]|<Route>|<Platform>` and advisor tasks `💡A|<Model> [<Reasoning>]|<Route>|<Platform>`; keep executor and review titles unprefixed as `E|...` and `R|...`. The emoji immediately precedes the role code with no space. Keep project identity in duplicate detection rather than the title. Example: `E|GPT-5.6 Luna [High]|OpenAI|Codex`.
6. Before every dispatch or retry, compare at least two viable model-harness combinations using task complexity, required tools, live session and weekly quotas, monetary cost, and expected retry and verification cost. If fewer than two combinations are viable, state why. Native Codex preference must not override a cheaper sufficient route. Escalate model capability only when evidence shows a capability failure; first correct missing context, prompt defects, or harness and permission problems. CodexBar is optional: use it only when already installed and configured, use a reliable native usage surface when available, and otherwise report usage as unknown, never zero. For a non-native lane, read [references/optional-integrations.md](references/optional-integrations.md).
7. Present the owner with the complete frozen executor prompt and routing summary, including prompting-guide source and model coverage. Do not dispatch, implement, test, commit, push, deploy, or begin a new phase until the specifically required approval is explicit.
8. Before Codex dispatch, add a `Callback transport` block to the frozen prompt with `orchestrator_thread_id` (the Codex task ID) and `orchestrator_host_id`. Refresh both values on every new or reused executor dispatch. If the environment does not expose either value, state that limitation and the fallback before dispatch.
9. After the owner explicitly approves dispatch of the frozen prompt, use one executor for one bounded task. For the Codex platform, reuse an exact user-visible Codex task or create one with the canonical title; that approval authorizes only that named task's reuse or creation and dispatch. An internal subagent is not a Codex executor task and must not substitute for it. Internal subagents may support the orchestrator only with read-only analysis when otherwise permitted. After dispatch, confirm the executor title, task ID, and host ID to the owner, then return instead of routinely waiting. On success or blocker, require the executor to build the complete report, call `send_message_to_thread` with that report to the orchestrator, and only then post the same report as its own final response. The callback is evidence, never owner authorization. If callback delivery is unavailable or fails, use `wait_threads` and, only for targeted diagnosis, `read_thread`. Do not allow redelegation unless approved.
10. Independently verify the report against repository state, artifacts, and authorized checks. Record only the gates actually established and propose exactly one next action.

## ACP bridge lane

When the owner asks to use an external agent, follow the ACP bridge reference for setup, live usage, session reuse and naming, start, prompt, wait, permission decisions, resume, and stop. The bridge has no verified automatic callback into a Codex task: inspect its `acp wait` result and continue polling manually when it reports that work is still running. Never claim that a callback was sent or received unless the transport is separately verified.

## Required Routing Summary

Before dispatch, provide:

- bounded objective and stop condition;
- at least two viable model-harness combinations, or why only one is viable, compared by task fit, tools, session and weekly quotas, monetary cost, and expected retry and verification cost;
- chosen platform, route, model, and reasoning level, with a short capability/cost rationale;
- live usage by relevant provider when available, with timestamp or freshness label;
- canonical task title and reuse result;
- complete executor prompt; and
- explicit list of actions that remain unauthorized.

If a manual advisor is selected, provide a self-contained prompt for the owner to paste. Advisor output remains unverified until checked against primary artifacts.

## Boundaries

- Approval is action-specific and does not carry into later phases.
- Read-only inspection does not authorize mutation, tests, provider calls, dispatch, commits, pushes, deployment, or production activity.
- Do not install or enable integrations, send repository content off-machine, or incur paid usage without explicit authorization.
- Never claim that one validation gate implies another.
- Do not modify an approved prompt silently. Material changes require a numbered amendment and renewed approval.
- Preserve unrelated working-tree changes and project-specific instructions.
