Date: 2026-10-04  
Version: 1.0

# Prompting Guidance for Covered Models

## Applicability boundary

> **This guidance applies only to the exact models and documented model families named below. Do not generalize it to another model, version, provider route, or execution harness without current authoritative evidence.**
>
> **Harness behavior is separate from model behavior. Running the same model through Codex, Claude Code, OpenCode, Antigravity, or another harness does not establish identical prompting behavior.**
>
> **The provider-neutral checklist below is a checklist for the covered models, not a universal claim about unlisted models.**

This guide covers the following models and no others:

- **OpenAI:** GPT-6 Astra, GPT-6.1 Sol, GPT-6 Sol, GPT-6 Luna, GPT-5.6 Sol, GPT-5.6 Terra, and GPT-5.6 Luna.
- **Anthropic:** Claude Fable 5.1, Claude Opus 5.5, Claude Opus 5, and Claude Sonnet 5.5.

These names identify model documentation, not every deployment alias. Confirm the exact model ID and version available on the selected provider route. A routed label, compatibility alias, or similarly named model is outside this guide unless an authoritative source documents that mapping.

## Checklist shared by the covered models

Use these as starting checks, then evaluate them on the exact model and integration:

1. State the requested outcome and deliverable. Define acceptance conditions when correctness or completion is not obvious.
2. Supply the relevant context, evidence, and source authority. Mark facts that are dated, uncertain, or supplied as examples.
3. Separate instructions from quoted material, examples, and task input. Use headings or structured delimiters when they make mixed content easier to distinguish.
4. Specify output requirements that matter, such as fields, format, length, audience, and what to do when information is missing. Add examples when they resolve a real ambiguity.
5. Include only the process, tools, and verification steps needed for the task. Put authorization and side-effect boundaries in the prompt, while relying on the harness and provider controls to enforce them.
6. Measure prompt changes on representative tasks using the selected model, route, tools, context, and harness. A single successful response does not establish that a prompt generalizes.

“Shared” here means the covered OpenAI and Anthropic models have authoritative documentation supporting these as useful starting practices. It does not mean the models behave identically or that these rules apply to other models.

## OpenAI models

For the GPT-6 and GPT-5.6 models listed above, prefer direct instructions with a clear outcome, relevant context, and only the constraints and process the task needs. Keep repeated instructions and legacy scaffolding out unless an evaluation shows they prevent a real failure. Specify style, response length, or output structure when the product needs those details. For reasoning models, ask for the result and useful evidence or a brief explanation; do not ask the model to expose private chain-of-thought.

### Family-specific exceptions

- **GPT-6 Astra:** The official guide says its GPT-6 starting guidance reflects observed Astra behavior and should be evaluated on the chosen model. Astra may ask when ambiguity could change the result and is more sensitive to conflicting instructions in context. State which instructions have priority, which routine assumptions it may make, and which ambiguity requires a question. Specify style or delegation only when the application needs it.
- **GPT-6.1 Sol, GPT-6 Sol, and GPT-6 Luna:** Use the GPT-6 family material as a starting point, not as proof of identical behavior. The official family guide specifically notes that GPT-6.1 Sol does not support `none` reasoning effort while GPT-6 Sol and GPT-6 Luna do. That is an API parameter constraint, not a prompt rule; check the current model and harness documentation before setting effort.
- **GPT-5.6 Sol, GPT-5.6 Terra, and GPT-5.6 Luna:** The official guide recommends outcome-oriented prompts with relevant context, hard constraints, approval boundaries, and success criteria. Older prompt stacks may prescribe more process than these models need. When migrating, compare the current effort setting with one level lower on representative tasks instead of carrying settings forward as a quality assumption.

For all listed OpenAI models, tool availability, API parameter support, reasoning effort, verbosity controls, and output schemas depend on the exact model and integration. These are not established by running the model in a particular harness; consult current provider and harness documentation separately.

## Anthropic models

Across the official prompting pages linked below for these named models, the sources recommend clear, direct instructions, relevant context, specific output requirements, and well-chosen examples. XML tags can help separate instructions, context, documents, examples, and input in a complex prompt; use them when structure helps rather than as decoration. For long source material, keep its boundaries and provenance clear. Tool-use conditions should be stated when they affect freshness or correctness.

Request a concise rationale or action summary when useful; do not ask for hidden reasoning. The Anthropic API’s adaptive thinking and `effort` controls are provider/API features. Their availability, defaults, and effects vary by model and can differ by harness.

### Model-specific exceptions

- **Claude Fable 5.1:** The official guide recommends a fresh effort sweep because equal effort names need not produce equal reasoning across models. At low effort it may call search and retrieval tools less often, so state when freshness requires a search. Long runs may provide fewer visible progress updates; request them only when the client exposes them. API integrations that replay thinking blocks must preserve the exact conversation prefix and blocks as required by Anthropic’s current API rules.
- **Claude Opus 5.5:** Its API default effort is `medium`, unlike the `high` default documented for Claude Opus 5. Do not carry effort settings forward without evaluation. Effort controls reasoning work more directly than visible response length, so state the desired answer length separately. This model has its own prompting page for progress, long-running work, and harness-dependent behavior.
- **Claude Opus 5:** The specific guide recommends supplying the complete task specification up front for difficult agentic work, controlling visible length explicitly, limiting delegation to useful independent work, and avoiding redundant verification scaffolding. Its API default effort is `high`; calibrate it on the actual task set.
- **Claude Sonnet 5.5:** Its guide describes more literal instruction following and cases where low or medium effort may check in before completing coding work. Make item-level scope and completion criteria explicit when those behaviors matter; test effort settings on the selected task set rather than copying Claude Sonnet 5 settings. Search triggers, adaptive thinking, and structured output behavior also depend on the integration.

## Executor prompt template

Use for an executor only after its route, authority, and dispatch are approved. Include the model-specific prompting guidance only when it is relevant to this task.

```text
Role: [responsibility]
Outcome: [observable result]
Context and sources: [relevant files, facts, provenance, and dates]
Authorized scope: [files or actions allowed; approval boundary]
Tools and route: [approved tools/provider/model, plus conditions for using them]
Acceptance: [testable completion conditions]
Report: [result, evidence, checks run, assumptions, and limitations]
```

## Advisor prompt template

Use for a read-only reviewer or advisor. Do not imply authority to change files, dispatch work, or perform side effects.

```text
Role: Read-only advisor for [topic]
Question: [bounded decision or review question]
Context and sources: [relevant files, evidence, provenance, and dates]
Review criteria: [specific risks, claims, or acceptance conditions to assess]
Restrictions: Do not modify files, run side-effecting actions, or dispatch work.
Report: Findings with file/source evidence, uncertainty, and any open question.
```

## Sources checked 2026-10-04

**OpenAI**

- [Prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering) — instruction placement, delimiters, current model prompting, and model-specific variation.
- [Using GPT-6](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-6-astra) — GPT-6 family prompts, Astra behavior, and current parameter notes.
- [Using GPT-5.6](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.6) — GPT-5.6 family migration and effort guidance.
- [Reasoning best practices](https://developers.openai.com/api/docs/guides/reasoning-best-practices) — concise prompting, delimiters, examples, and no need to request chain-of-thought.

**Anthropic**

- [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) — current shared Claude techniques and coverage notes.
- [Prompting Claude Fable 5.1](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1) — effort, search triggering, progress, conversation history, and task completion.
- [Prompting Claude Opus 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5) — changes from Opus 5, effort, long-running work, and harness-specific behaviors.
- [Prompting Claude Opus 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5) — agentic task specification, effort, scope, output length, and delegation.
- [Prompting Claude Sonnet 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5) — effort calibration, initiative, tool use, JSON, and coding verification.
- [Effort](https://platform.claude.com/docs/en/build-with-claude/effort) — current model-specific defaults and effort behavior.

## Limitations

These are dated summaries of provider documentation, not measured guarantees. Provider pages can change, may describe only API behavior, and may lag or differ across model, account, region, and product surface. A parameter documented for an API is not necessarily available through Codex, Claude Code, OpenCode, Antigravity, or another harness. Verify the exact model ID, route, harness, and controls at use time, and test consequential prompt changes on representative tasks. No claim is made for models or families not listed above.
