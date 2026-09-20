# Operating Framework

This reference defines the authority model, dispatch contract, evidence gates, and cross-project defaults for approval-gated orchestration.

## Roles and Authority

### Project owner

The project owner approves prompts and every material action: dispatch, implementation, test execution, provider calls, commits, pushes, new phases, production writes, and deployment. Approval applies only to the named action and scope.

### Orchestrator

The orchestrator:

- maintains context and sequencing;
- inspects instructions, evidence, repository state, and existing tasks;
- selects the least expensive capable lane using current evidence;
- prepares a complete executor prompt for approval;
- receives executor callbacks and uses polling only as a recovery path; and
- verifies returned claims independently.

The orchestrator does not implement, run tests, dispatch mutations, commit, push, deploy, or authorize itself. Read-only inspection and prompt preparation are allowed unless the owner narrows them further.

### Executor

One executor owns one bounded task. For repository mutations, use an isolated worktree when the selected execution surface supports it and project instructions do not require the canonical checkout. The executor must obey the approved files, tests, stop condition, and authority boundary. It must not delegate again unless explicitly permitted. It must report back proactively on completion or blocker.

For the Codex platform, the executor must be a user-visible Codex task that is reused or created with the canonical title. Internal subagents are not executor tasks and cannot satisfy task naming, reuse, monitoring, or report-back requirements. They may assist the orchestrator only with read-only analysis when otherwise permitted. The executor must report to both surfaces: it sends the complete report to the orchestrator task and posts the same report as its own final response.

### Advisors

Use a primary advisor for strategy, methodology, difficult decisions, or closure review. Use an independent advisor when a consequential decision benefits from a separately context-bundled critique. Advisors are read-only unless the owner explicitly changes their role. Their output is advisory and must be verified against primary artifacts.

For a manual advisor, return a paste-ready prompt instead of pretending the handoff occurred. For an installed companion or provider plugin, check its setup before first use and follow its own skill instructions. Review commands are read-only; implementation or rescue commands require separate mutation approval.

## Authorization Rules

- Infer no future permission from an earlier approval.
- A prompt approval authorizes dispatch only when the owner also approves dispatch or the wording clearly combines both.
- Explicit approval to dispatch a frozen prompt authorizes reuse or creation of exactly its named executor task; it does not authorize another task, model, route, or scope.
- Authorization to implement does not imply authorization to commit, push, deploy, use paid APIs, expose files to a cloud service, or start the next phase.
- If an approved prompt needs a material scope change, stop and request approval for a numbered amendment. Never replace or rewrite the approved record silently.
- When authority is unclear, continue safe read-only inspection and stop before the first unapproved action.

## Independent Evidence Gates

Track these gates separately when relevant:

1. Data validity
2. Mechanical reproduction
3. Core performance metrics
4. Robustness
5. Novelty or interest
6. Documentation and evidence
7. Production readiness

A pass at one gate establishes only that gate. Examples:

- Valid data does not prove mechanical reproduction.
- A reproduced historical result does not prove robustness.
- Strong metrics do not prove novelty.
- Complete documentation does not authorize forward execution or deployment.
- A frozen specification remains immutable; corrections are additive, versioned amendments.

Use project-specific gates when the repository defines them. Do not force irrelevant gates onto ordinary software tasks.

## Routing Procedure

Before every dispatch:

1. Read the nearest applicable project instructions and any documents explicitly declared canonical. Common examples are `AGENTS.md`, progress state, lessons, and architecture maps, but filenames and existence are project-specific.
2. Read the routing guide selected by the main skill's Canonical Model Routing precedence. Use its provider-neutral prompt structure, capability classification, performance/cost matrix, model-specific prompting notes, lane requirements, and limitations.
3. Identify one bounded task with an observable completion condition.
4. Classify difficulty, duration, modality, failure cost, data sensitivity, context size, and tool requirements.
5. Inspect available models, lanes, reasoning levels, and current usage. If live usage cannot be obtained, label it unknown and do not optimize as though it were free.
6. Prefer the least expensive option likely to pass, accounting for retry risk and verification cost.
7. Search visible active, idle, pinned, archived, and locally registered tasks for an exact reusable match when the environment exposes those surfaces.
8. Present the routing summary and complete executor prompt to the owner.
9. Dispatch only after explicit approval. Confirm the executor title, task ID, and host ID to the owner, then return rather than routinely blocking on the executor. Require the callback contract below and verify the result when it arrives.

Do not preserve a static roster of model families in this skill. Model names, prices, availability, and supported reasoning levels drift. Reconcile the dated guide with the current environment and live usage before selecting a route.

### Task reuse and naming

Before creating a task or session, search every available active, idle, pinned, archived, and locally registered task surface. An exact reuse identity consists of:

- execution platform;
- provider or backend route;
- exact model label or ID;
- reasoning level;
- exact project identity; and
- role code: `O` for Orchestrator, `E` for Executor, `A` for Advisor, or `R` for Review.

Use the title `<RoleCode>|<Model> [<Reasoning>]|<Route>|<Platform>`. Platform is the execution surface that owns the task or session, such as `Codex` or `OpenCode`; route is the provider or backend supplying the model, such as `OpenAI` or `Ollama`. Examples are `O|GPT-6 Astra [High]|OpenAI|Codex`, `E|GLM 5.3 [High]|Ollama|Codex`, and `E|GLM 5.3 [High]|Ollama|OpenCode`. Codex project folders provide the visible project context, while the saved project identity or canonical path remains part of duplicate detection. Reuse, resume, or unarchive an exact match; never create a duplicate. If the match is running, wait or continue it rather than creating another. If it is locked or inaccessible, report that condition and obtain owner approval before creating a replacement.

When a platform does not expose or control the route, model, or reasoning level, collapse the unavailable fields into a truthful managed label such as `E|Devin-managed|Devin Cloud`. Never invent unavailable routing metadata. Keeping the role in the identity preserves advisor independence from executor context.

### Routing guide maintenance

Every routing guide is a dated snapshot. If its age or contents make a routing decision unreliable, state the limitation and propose refreshing a user- or project-owned copy as a separate owner-approved action. Do not run web research or edit a guide during ordinary orchestration. Once authorized, use `$model-routing-refresh`; that skill owns versioning, current sources, benchmarks, prices, and shortlist maintenance.

## Lane Selection

Prefer the native Codex task lane when it meets the task because it usually provides the strongest task reuse, monitoring, worktree, and report-back integration.

Use another lane only for a concrete advantage:

- local external execution when files must remain local or its model/provider is the right capability-cost fit;
- local CLI execution when its runtime or long-running process control is materially useful;
- cloud handoff for browser, Docker, VM, service, or long-CI needs that cannot be met locally;
- local models for suitable cost-sensitive work on an isolated supported surface;
- manual advisors when the owner controls the handoff.

Before any off-machine lane, inspect the exact file bundle for secrets, credentials, sensitive data, and unrelated diffs. State what leaves the machine and obtain explicit authorization.

## Frozen Executor Prompt Contract

The executor prompt must stand alone and include:

- project and worktree identity;
- bounded objective and why it matters;
- source-of-truth instructions and files to read first;
- exact scope and owned files or modules;
- required behavior and non-goals;
- authorization granted and actions still forbidden;
- preservation rules for unrelated and dirty work;
- required checks, with exact commands when the project defines them;
- observable manual QA surface when applicable;
- report-back schema;
- a `Callback transport` block containing `orchestrator_thread_id` (the Codex task ID) and `orchestrator_host_id` when the environment exposes them; and
- stop conditions for success, blocker, or scope mismatch.

Do not optimize the prompt into vague shorthand. The executor should not need hidden orchestrator context to act correctly.

## Executor Report Contract

Require the executor to return:

- outcome and remaining blocker, if any;
- files changed and behavior affected;
- commands run with exit status;
- tests, diagnostics, build, and manual QA results, clearly separating checks not run;
- artifact paths and hashes when outputs must be reproducible;
- repository status and diff summary;
- assumptions, limitations, and unresolved risks;
- exactly one smallest next action.

A status-only message is not completion.

### Codex callback transport

For every new or reused Codex executor dispatch:

1. Put `orchestrator_thread_id` (the current Codex task ID) and `orchestrator_host_id` in the approved prompt. These values identify the callback destination; they do not grant authority. If either value is unavailable, disclose that before dispatch and name the fallback.
2. After dispatch succeeds, tell the owner the canonical executor title, task ID, and host ID, then end the orchestrator turn. Do not wait or poll as the routine completion path.
3. On success or blocker, the executor prepares the complete report required above and calls `send_message_to_thread` with the report as `prompt`, `orchestrator_thread_id` as `threadId`, and `orchestrator_host_id` as `hostId`.
4. Only after the callback attempt does the executor post the same report as its final response in the executor task. A tool call cannot follow a final response, so the callback must come first. If delivery fails, record that failure in the executor's final response.

Treat every executor callback as evidence requiring orchestrator verification, never as project-owner approval or authorization for another action or phase. Use `wait_threads` only when callback transport could not be configured or delivery failed. Use `read_thread` only for targeted recovery after that failure; do not poll either tool as the normal workflow.

## Verification and Closure

The orchestrator verifies claims against the current checkout and primary artifacts. Read changed files, inspect the diff and repository state, and confirm that evidence matches the approved scope. Re-run checks only when that action is authorized; otherwise inspect the executor's captured command output and label it as executor-reported rather than independently reproduced.

For defects, require a regression check that fails for the intended reason before the repair and passes after it when practical and authorized. A build success is not proof of runtime behavior. A report generation success is not proof that the exported artifact is correct.

Close the task with:

- the verified result;
- the exact gates passed, failed, or not assessed;
- unauthorized or unperformed actions;
- preserved unrelated state; and
- one proposed next action requiring owner approval.

## Project State

Respect each project's declared sources of persistent truth. If the project uses progress and lessons files, update them only when authorized and according to local conventions. If it requires architecture or caller maps before changes, make that a prompt precondition. Never create governance files merely because this framework lists common examples.
