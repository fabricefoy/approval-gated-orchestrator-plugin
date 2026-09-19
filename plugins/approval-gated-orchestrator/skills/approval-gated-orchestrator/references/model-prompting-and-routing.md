Date: 2026-09-19
Version: 1.11

# Model Prompting and Routing Guide

This is a point-in-time routing guide for public model APIs and hosted model catalogs. “Latest” means the newest model family or release visible in the sources below on 2026-09-19. Provider-specific snapshots retain their own stated dates. Recheck before making a production choice.

## Part 1: Prompting Guidance and Principles

### A provider-neutral prompt shape

Use this compact structure for most tasks:

```text
Role: [specialization and operating posture]
Objective: [one observable outcome]
Context: [facts, files, data, audience, and source authority]
Constraints: [scope, safety, format, length, time, and budget]
Method: [only the checks or tools that are actually needed]
Output: [exact sections, schema, or artifact]
Acceptance criteria:
- [testable condition 1]
- [testable condition 2]
If information is missing: state the assumption or ask one focused question only when it changes the result.
```

### Principles that transfer across the models

1. State the outcome and acceptance criteria. “Analyze this” is weaker than “rank the three options, cite the evidence, and recommend one under a $500 limit.”
2. Put authoritative context before the request when supplying long documents. Label sources, dates, and uncertainty.
3. Separate instructions, context, examples, and input. XML tags or clear Markdown headings are useful when the prompt mixes several document types.
4. Use a small number of representative examples for stable style or extraction. Three to five diverse examples are usually enough; include edge cases rather than many near-duplicates.
5. Specify output shape directly. For machine use, give a JSON schema or field list, permitted values, null behavior, and one example.
6. Calibrate effort to task complexity. Use low effort for short, bounded transformations; raise effort for multistep reasoning, research, coding, tool use, or ambiguous evidence.
7. Ask for verification that is proportionate to risk. Require source checks, tests, or reconciliation for decisions; do not add repeated “double-check” loops to trivial work.
8. Make tool policy explicit. Say when to search, browse, call an API, or avoid a tool. Require the model to distinguish retrieved facts from inference.
9. Make scope and autonomy explicit. State what is authorized, what requires approval, and what is out of scope. Tell an agent to finish the requested reversible work instead of stopping at a plan.
10. Keep a stable prompt prefix for caching. Put durable instructions and reference material first; append changing user data later.
11. Evaluate prompts on a task set. Measure correctness, omission, format validity, latency, token use, and cost. Do not infer quality from a single impressive answer.
12. Treat names, prices, APIs, and benchmark scores as volatile facts. Search current sources instead of relying on model memory.

### OpenAI-specific guidance

The official OpenAI guide describes GPT-6 Astra as the newest frontier model and documents GPT-5.6 as the preceding family. Use the exact API model IDs shown by the account or deployment; the names below are the current model labels requested for this guide.

- GPT-6 Astra: Give a clear outcome, scope, writing style, delegation policy, and test boundary. Astra is more likely to ask for clarification and tends toward detailed formatting; explicitly tell it when to make routine assumptions and persist. It can use structured outputs, tool calling, computer use, asynchronous tool calls, mid-turn steering, and adjustable reasoning. It does not support `none` reasoning effort.
- GPT-5.6 Sol: Use for demanding general reasoning, coding, and professional work. Define the deliverable and evidence threshold up front; use higher reasoning for long-horizon or failure-sensitive work and a cheaper tier for bounded transformations.
- GPT-5.6 Terra: Use when multimodal or engineering depth matters but the task does not require the maximum frontier tier. State the files, interfaces, visual evidence, and tests that define completion.
- GPT-5.6 Luna: Use for fast, high-volume, or cost-sensitive work. Keep prompts narrow, specify the exact output schema, and route uncertain or multi-step cases upward rather than adding elaborate prompt scaffolding.

For all four, prefer the Responses API for tool workflows, use structured outputs for machine-consumed results, and avoid unsupported sampling parameters when the model documentation disallows them. Change reasoning deliberately and compare the result against a fixed eval set.

### Anthropic-specific guidance

Anthropic’s current lineup lists Claude Fable 5.1 for demanding reasoning and long-horizon agentic work, Claude Opus 5 for complex agentic coding and enterprise work, and Claude Sonnet 5 for the speed/intelligence balance. Current public API pricing is listed as $10/$50, $5/$25, and $2/$10 per million input/output tokens respectively.

- Claude Fable 5.1: Use the default `high` effort as a starting point, then test `low`, `medium`, `xhigh`, and `max` on the actual evals. For long agent loops, request concise progress updates, batch independent tool calls, keep conversation history append-only, and tell the model to finish the full requested task. At low effort, explicitly request search when freshness matters; for small file changes, request targeted edits rather than whole-file rewrites.
- Claude Opus 5: Give the full specification up front for difficult coding and agentic work. It self-corrects and verifies well, so avoid redundant “double-check” scaffolding. Control visible length explicitly, cap subagent delegation to genuinely independent work, and use lower effort when quality holds.
- Claude Sonnet 5: Use adaptive thinking and the `effort` parameter as the primary quality/cost control. `high` is the default, `xhigh` suits the hardest coding and agentic tasks, and `low` is for short scoped work. Its instruction following is literal, so state whether a rule applies to every item. Prompt explicit tool-use conditions when search or tools are required, and leave `max_tokens` headroom for thinking and tools on long tasks.

For all current Claude models, be direct, explain important context, use XML tags for mixed inputs, and use relevant few-shot examples. Do not use manual extended-thinking settings or sampling parameters that the current model rejects.

### Reusable high-reliability prompt

```text
You are [role]. Complete [observable outcome] for [audience].

<context>
[authoritative facts, files, data, and dates]
</context>

<constraints>
- Stay within [scope].
- Use [tools/sources] only when [condition].
- Separate verified facts, calculations, and inferences.
- Do not invent missing values; use null or state the gap.
</constraints>

<deliverable>
[exact format, length, schema, and ordering]
</deliverable>

<acceptance>
[testable completion criteria]
</acceptance>

Choose an appropriate effort level. Finish the authorized work, then report assumptions, evidence, and residual uncertainty briefly.
```

## Part 2: Model Routing

### Benchmark basis

The main comparison source is Artificial Analysis Intelligence Index v4.3. In this snapshot it combines ten evaluations: AA-Briefcase, GDPval-AA v2, AutomationBench-AA, Terminal-Bench 4.0, SciCode, Humanity’s Last Exam, GDP.pdf, CritPt, AA-Omniscience, and AA-LCR v1.1. These cover agentic knowledge work, professional tasks, SaaS automation, terminal coding, science, physics, document reasoning, knowledge/grounding, and long-context reasoning.

Use the composite score as a screening signal, not as a universal truth. For a real deployment, rerun a capability-specific eval with the actual prompt, tools, context size, latency target, and failure costs.

### Capability and relative complexity

| Code | Capability | Relative complexity | Useful benchmark evidence | Routing note |
|---|---|---:|---|---|
| C1 | Frontier reasoning and research | High | Humanity’s Last Exam, AA-Briefcase, GDPval-AA | Use a frontier model when evidence synthesis or ambiguity matters. |
| C2 | Agentic coding and terminal work | High | Terminal-Bench 4.0, SciCode, GDPval-AA | Give the complete task and acceptance tests; escalate on failed checks. |
| C3 | Mathematics, science, and technical analysis | High | SciCode, CritPt, Humanity’s Last Exam | Spend effort on derivation and verification, not on stylistic verbosity. |
| C4 | Multimodal, chart, image, and document reasoning | High | GDP.pdf, multimodal task slices | Provide the original asset and request crop/zoom or visual checks when needed. |
| C5 | Long-context synthesis and retrieval | High | AA-LCR v1.1, AA-Omniscience | Put source material before the query and require source-linked conclusions. |
| C6 | Tool use and workflow automation | High | AutomationBench-AA, AA-Briefcase, τ³-Banking | Define tool triggers, side-effect boundaries, and completion state. |
| C7 | Extraction, classification, and structured JSON | Low | Instruction-following and faithfulness slices | Prefer a fast model with a strict schema and null policy. |
| C8 | Summarization, rewriting, translation, and ordinary chat | Low | Writing, instruction-following, user-interaction slices | Optimize for latency, style consistency, and cost. |
| C9 | High-volume or local/open-weight inference | Low to medium | Openness Index plus task-specific evals | Route sensitive or throughput-heavy work here when quality is adequate. |

### Cost convention

The table below uses current OpenRouter catalog prices as a comparable hosted-routing snapshot. Values are USD per 1 million blended tokens using a 3:1 input-to-output mix: `0.75 × input price + 0.25 × output price`. They are not a promise of direct-provider pricing, availability, or latency. Cost bands are: low `< $0.50`, middle `$0.50–$3.00`, expensive `> $3.00`.

“AA v4.3 score” is the current Artificial Analysis Intelligence Index where a score was visible in the snapshot. A dash means the model was included as a current specialist/value candidate but did not have a comparable current composite score; it is not a zero.

### Best-50 current shortlist

This is a capability-balanced shortlist, not a claim that one scalar leaderboard settles every workload. It is ordered roughly by measured general intelligence, then by capability coverage and cost-efficient alternatives. Routed prices were checked for all 50 entries; a dash marks a model that was not present in the current public routed catalog.

| # | Model / provider | Evidence | Blended $/M | Cost | Performance for best-fit work | Best-fit capabilities |
|---:|---|---:|---:|---|---|---|
| 1 | Claude Fable 5.1 / Anthropic | AA v4.3 53.4 | 20.00 | Expensive | High | C1, C5, C6 |
| 2 | GPT-6 Astra / OpenAI | AA v4.3 52.8 | 20.00 | Expensive | High | C1, C2, C4, C6 |
| 3 | Claude Opus 5 / Anthropic | AA v4.3 50.7 | 10.00 | Expensive | High | C1, C2, C4, C5 |
| 4 | Claude Fable 5 / Anthropic | — | 20.00 | Expensive | High | C1, C5, C6 |
| 5 | Muse Spark 1.3 / Meta | — | 2.00 | Middle | High | C4, C8 |
| 6 | GPT-5.6 Sol / OpenAI | AA v4.3 47.1 | 4.00 | Expensive | High | C1, C2, C6 |
| 7 | Grok 4.6 / xAI | AA v4.3 44.4 | 3.00 | Middle | High | C1, C6, C8 |
| 8 | Kimi K3 / Moonshot AI | AA v4.3 43.8 | 3.40 | Expensive | High | C1, C2, C5 |
| 9 | GLM-5.3 / Z AI | AA v4.3 44.9 | 1.40 | Middle | High | C1, C2, C3 |
| 10 | Gemini 3.8 Flash / Google | AA v4.3 41.2 | 1.50 | Middle | High | C4, C5, C6 |
| 11 | GPT-5.6 Terra / OpenAI | AA v4.3 42.3 | 4.50 | Expensive | High | C2, C3, C4, C6 |
| 12 | Qwen3.8 2.4T A95B / Alibaba | AA v4.3 40.0 | 3.00 | Middle | High | C1, C2, C5 |
| 13 | GLM-5.3 Flash / Z AI | AA v4.3 41.9 | 0.14 | Low | High | C2, C7, C9 |
| 14 | GPT-5.6 Luna / OpenAI | AA v4.3 37.5 | 0.45 | Low | High | C7, C8, C9 |
| 15 | DeepSeek V4 Pro 0813 / DeepSeek | AA v4.3 36.3 | 0.87 | Middle | High | C1, C2, C3 |
| 16 | Qwen3.8 27B / Alibaba | AA v4.3 33.9 | 0.80 | Middle | High | C2, C7, C9 |
| 17 | Gemini 3.7 Flash / Google | AA v4.3 39.4 | 1.50 | Middle | High | C4, C6, C8 |
| 18 | Claude Sonnet 5 / Anthropic | AA v4.3 38.4 | 4.00 | Expensive | High | C2, C7, C8 |
| 19 | Grok 4.5 / xAI | AA v4.3 39.1 | 3.00 | Middle | High | C1, C8 |
| 20 | Qwen3.8 Max / Alibaba | AA v4.3 45.4 | 3.00 | Middle | High | C1, C5, C6 |
| 21 | Qwen3.8 Flash / Alibaba | — | 0.23 | Low | Middle | C7, C8, C9 |
| 22 | Qwen3.7 Max / Alibaba | AA v4.3 29.9 | 2.21 | Middle | High | C1, C2, C5 |
| 23 | Qwen3.7 Plus / Alibaba | AA v4.3 25.8 | 0.56 | Middle | High | C2, C7 |
| 24 | Qwen3.7 Flash / Alibaba | — | 0.06 | Low | Middle | C7, C9 |
| 25 | Gemini 3.6 Flash / Google | AA v4.3 34.3 | 1.50 | Middle | High | C4, C6, C8 |
| 26 | Gemini 3.5 Flash / Google | AA v4.3 33.0 | 3.38 | Expensive | High | C4, C8 |
| 27 | Gemini 3.5 Flash-Lite / Google | AA v4.3 22.7 | 0.85 | Middle | Middle | C7, C8, C9 |
| 28 | Gemini 3.1 Pro Preview / Google | AA v4.3 30.4 | 4.50 | Expensive | High | C1, C3, C5 |
| 29 | Claude Sonnet 4.6 / Anthropic | — | 4.50 | Expensive | High | C2, C7, C8 |
| 30 | GPT-5.3 Codex / OpenAI | — | 4.81 | Expensive | High | C2, C6 |
| 31 | DeepSeek V4 Pro / DeepSeek | AA v4.3 30.9 | 0.62 | Middle | High | C1, C2, C3 |
| 32 | DeepSeek V4 Flash / DeepSeek | AA v4.3 24.8 | 0.06 | Low | Middle | C2, C7, C9 |
| 33 | DeepSeek V4 Flash 0731 / DeepSeek | AA v4.3 34.5 | 0.05 | Low | High | C2, C7, C9 |
| 34 | GLM-5.2 / Z AI | AA v4.3 34.0 | 0.85 | Middle | High | C2, C3, C5, C6 |
| 35 | MiniMax-M3 / MiniMax | AA v4.3 29.6 | 0.53 | Middle | High | C1, C2, C8 |
| 36 | MiMo-V2.5 Pro / Xiaomi | AA v4.3 26.4 | 0.54 | Middle | High | C2, C3 |
| 37 | MiMo-V2.5 / Xiaomi | AA v4.3 22.3 | 0.18 | Low | Middle | C7, C9 |
| 38 | Qwen3.5 397B A17B / Alibaba | AA v4.3 19.1 | 1.29 | Middle | Middle | C1, C2, C5 |
| 39 | Qwen3.5 122B A10B / Alibaba | AA v4.3 16.2 | 0.72 | Middle | Middle | C2, C7, C9 |
| 40 | Qwen3.5 35B A3B / Alibaba | — | 0.45 | Low | Middle | C7, C9 |
| 41 | Muse Spark 1.2 / Meta | AA v4.3 39.8 | 2.00 | Middle | High | C4, C8 |
| 42 | Llama 4 Maverick / Meta | AA v4.3 9.3 | 0.30 | Low | Middle | C4, C8, C9 |
| 43 | Llama 4 Scout / Meta | AA v4.3 6.5 | 0.15 | Low | Middle | C4, C5, C9 |
| 44 | Mistral Medium 3.5 / Mistral | AA v4.3 14.9 | 3.00 | Middle | Middle | C2, C8 |
| 45 | Devstral 2 / Mistral | AA v4.3 9.4 | 0.80 | Middle | High | C2, C9 |
| 46 | Mistral Large 3 / Mistral | — | — | — | Middle | C2, C8, C9 |
| 47 | Mistral Small 4 / Mistral | AA v4.3 11.5 | 0.26 | Low | Middle | C7, C9 |
| 48 | gpt-oss-120b / OpenAI | AA v4.3 12.3 | 0.26 | Low | Middle | C2, C7, C9 |
| 49 | Nova 2.0 Lite / Amazon | — | 0.85 | Middle | Middle | C4, C7 |
| 50 | Command A / Cohere | AA v4.3 13.9 | 4.38 | Expensive | Middle | C6, C8 |

### GLM-5.2 focused analysis

GLM-5.2 is a strong open-weight text reasoning option rather than a general multimodal model. Artificial Analysis now reports an Intelligence Index score of 34, rank 9 of 113 comparable models, 71.8 output tokens/second, a 1M-token context window, 753B total parameters with 40B active per token, and an MIT license. The page marks it deprecated and recommends GLM-5.3 for new work. Its input modality is text only, so do not route image, chart, or document-vision work to it without a separate extraction stage.

The direct pricing snapshot is $1.40 per 1M input tokens and $4.40 per 1M output tokens, which is $2.15/M under the guide’s 3:1 blend. The current OpenRouter routed catalog lists approximately $0.554/$1.742 input/output, or $0.85/M blended. That makes GLM-5.2 a middle-cost, high-performance candidate for agentic coding, technical reasoning, long-context text synthesis, and tool workflows, especially when open weights or deployment control matter. Because the benchmark page now marks it deprecated, prefer GLM-5.3 for new work when its newer release and task-specific evals outperform GLM-5.2; retain GLM-5.2 when its measured quality, license, or deployment path is the better fit.

### Ollama Cloud: price- and quota-aware routing

Ollama Cloud has two distinct cost signals. The token prices below estimate monetary consumption; Ollama's `Low` through `Extra High Usage` labels estimate relative pressure on the shared session and weekly allowances. They are not interchangeable. Before an Ollama dispatch, use `codexbar usage --provider ollama --format json` when CodexBar is already installed and configured; otherwise use another reliable live usage surface or report usage as unknown. Do not install or configure CodexBar as a routing side effect, and never treat a missing reading as zero.

Prices are Ollama's direct cloud prices in USD per 1 million tokens on 2026-09-13. The blended column uses the same 3:1 input-to-output convention as the main table: `0.75 × input + 0.25 × output`. Cached-input prices are shown separately and are not included in that blend.

| Ollama model ID | Input $/M | Cached input $/M | Output $/M | 3:1 blended $/M | Ollama usage class | Context | Routing role |
|---|---:|---:|---:|---:|---|---:|---|
| `gemma4:31b-cloud` | 0.14 | 0.05 | 0.40 | 0.21 | Low | 256K | Cheapest bounded text/vision work; use when its smaller context and lower agentic ceiling are acceptable. |
| `glm-5.3-flash:cloud` | 0.15 | 0.03 | 0.50 | 0.24 | Medium | 1M | Default for bounded coding, structured extraction, and cost-sensitive agentic work. |
| `deepseek-v4-flash:cloud` | 0.22 | 0.007 | 0.66 | 0.33 | Medium | 1M | Default for technical reasoning or a partially completed coding run that may need moderate debugging. |
| `glm-5.3:cloud` | 1.40 | 0.26 | 4.40 | 2.15 | High | 1M | Reserve for genuinely difficult long-horizon coding after a cheaper model misses a concrete acceptance criterion. |
| `kimi-k3:cloud` | 3.00 | 0.30 | 15.00 | 6.00 | Extra High | 1M | Reserve for frontier multimodal or long-horizon agentic work where cheaper routes have failed or lack capability. |

Practical implications:

1. Use the lowest reasoning level that meets the task's failure cost. Reasoning tokens consume both billed output and the shared allowance even when they are not useful to the deliverable.
2. Prefer resume prompts that name the exact checkpoint, remaining steps, and stop condition. Do not make a new model rediscover completed downloads, checks, or repository state.
3. For bounded coding, start with GLM-5.3 Flash; use DeepSeek V4 Flash when stronger technical reasoning is worth the small price increase. Escalate to GLM-5.3 only after an observed failure that capability, rather than context or prompting, plausibly caused.
4. Do not launch a long agentic task when the session window is unlikely to last through its next durable checkpoint. Require incremental commits and a detailed result returned to the orchestration task.
5. Monetary price does not predict quota depletion perfectly. Recheck the live session and weekly percentages after long turns and record the model plus reasoning level used.

### 3x3 cost/performance routing matrix

Performance is the expected result for the selected capability, not a global model rank. Choose the lowest-cost cell that meets the acceptance threshold, then escalate when the task fails its eval.

| Performance \ Cost | Low: < $0.50/M | Middle: $0.50–$3.00/M | Expensive: > $3.00/M |
|---|---|---|---|
| High | GLM-5.3 Flash, GPT-5.6 Luna, DeepSeek V4 Flash 0731 for bounded or cost-sensitive work | Gemini 3.8 Flash, GLM-5.3, Grok 4.6, Qwen3.8, Muse Spark 1.3 for strong general/value routing | GPT-6 Astra, Claude Fable 5.1, Claude Opus 5, GPT-5.6 Sol for frontier reasoning, agentic coding, and high-risk work |
| Middle | Qwen3.7 Flash, MiMo-V2.5, Mistral Small 4, gpt-oss-120b for extraction, batch transforms, or local/open-weight paths | Qwen3.7 Plus, MiniMax-M3, MiMo-V2.5 Pro, Devstral 2, Nova 2.0 Lite for balanced production workloads | Claude Sonnet 5, GPT-5.6 Terra, GPT-5.3 Codex, Gemini 3.1 Pro, Command A when a specific modality or tool path justifies the price |
| Low | Do not select solely on price; reserve for non-critical drafts or fallback traffic | Use only after a local eval demonstrates acceptable quality and failure cost | Avoid; high spend does not compensate for a capability mismatch |

### Practical router

1. Classify the request into C1–C9 and mark it low or high complexity.
2. Set the minimum acceptable performance. For high-complexity work, start in the high row; for low-complexity work, start in middle or high performance at low cost.
3. Select the cheapest model in the qualifying cell with the required modality, context, data residency, and tool support.
4. Set model effort and output limits to the task, not to the model’s maximum. Keep machine outputs schema-constrained.
5. Escalate one tier when the model misses an acceptance criterion, cannot ground a claim, or exhausts its context/tool budget. Record the failure reason.
6. Periodically rerun the same eval set. Replace a route only when quality, cost, latency, availability, or policy evidence changes.

### Cross-platform task reuse and naming

Before creating a task or session, search active, idle, pinned, archived, and locally registered tasks. Reuse, resume, or unarchive an exact match; never create a duplicate. The reuse identity is execution platform, provider or backend route, exact model, reasoning level, exact project, and role. Name it `<RoleCode>|<Model> [<Reasoning>]|<Route>|<Platform>`, using `O` for Orchestrator, `E` for Executor, `A` for Advisor, and `R` for Review. Examples are `O|GPT-6 Astra [High]|OpenAI|Codex`, `E|GLM 5.3 [High]|Ollama|Codex`, and `E|GLM 5.3 [High]|Ollama|OpenCode`. Codex project folders provide the visible project context, but the saved project identity or canonical path remains part of duplicate detection. If a platform does not expose routing details, use a truthful managed label instead of inventing them.

## Part 3: Refresh and Maintenance

This file is the plugin's bundled fallback snapshot. Ordinary orchestration reads it but never edits it. Use `$model-routing-refresh` only after explicit authorization; refreshed output belongs in a user- or project-owned guide.

### Portable execution lanes

Native Codex remains the default when it meets the acceptance criteria. Other platforms and provider routes are optional runtime integrations, not plugin dependencies.

| Platform | Route | Prefer when | Pre-dispatch checks |
|---|---|---|---|
| Codex | OpenAI | Native task reuse, worktrees, monitoring, and report-back meet the task | Exact project, model, reasoning, live usage when available, matching-task search |
| Codex | Ollama | A supported Ollama model is selectable directly in Codex | Exact model ID, supported reasoning, current catalog and usage |
| OpenCode | Available provider | Local external execution or provider choice is a concrete advantage | Installed health, project path, provider, model, reasoning, owned files, stop condition |
| Devin Local or Cloud | Devin-managed or exposed provider | Its runtime, VM, browser, Docker, service, or long-CI capability is required | Local/cloud boundary, repository state, secrets, exposed routing metadata, authorization |

Hard rules:

1. Select the lowest-cost platform, route, model, and reasoning level likely to meet the acceptance criteria. Escalate only after a concrete capability failure.
2. Missing or ambiguous usage is unknown, never zero.
3. Search all available task surfaces before creation. Reuse, resume, or unarchive an exact match; never create a duplicate.
4. Use `<RoleCode>|<Model> [<Reasoning>]|<Route>|<Platform>`. Project identity remains part of reuse matching but stays out of the visible title.
5. Preserve task and session IDs. Never resubmit merely because a wait timed out.
6. Do not install, start, repair, or reconfigure an optional integration without authorization.
7. Before off-machine work, inspect the exact transmitted state for secrets and unrelated changes and obtain explicit authorization.
8. If a platform does not expose model or reasoning selection, use a truthful managed label instead of inventing metadata.

### Sources checked on 2026-09-19

- [OpenAI model guidance](https://developers.openai.com/api/docs/guides/latest-model) — GPT-6 Astra and GPT-5.6 prompting, reasoning, tools, and migration guidance.
- [Anthropic prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) — general Claude prompting, context, examples, XML structure, tools, thinking, and agentic guidance.
- [Prompting Claude Fable 5.1](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1) — effort, long-run completion, batching, history, search, and output guidance.
- [Prompting Claude Opus 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5) — agentic coding, verbosity, effort, scope, subagents, and self-correction.
- [Prompting Claude Sonnet 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5) — adaptive thinking, effort, tool triggering, literal instruction following, and verbosity.
- [Anthropic models overview](https://platform.claude.com/docs/en/models/overview) and [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) — current model IDs, capabilities, and direct token prices.
- [Artificial Analysis model comparison](https://artificialanalysis.ai/models) — Intelligence Index v4.3 methodology, benchmark families, rankings, and cost-per-task views.
- [Artificial Analysis model releases](https://artificialanalysis.ai/models/releases) — latest release families, category evidence, composite scores, context, and cost-per-task snapshot.
- [OpenRouter model API](https://openrouter.ai/api/v1/models) — routed model IDs and current input/output catalog prices used for the 3:1 blended-cost column.
- [Artificial Analysis GLM-5.2 analysis](https://artificialanalysis.ai/models/glm-5-2) — current model-specific score, deprecation notice, class rank, speed, context, modality, license, and direct pricing.
- [Ollama GLM-5.3](https://ollama.com/library/glm-5.3%3Acloud) and [tags](https://ollama.com/library/glm-5.3/tags) — direct cloud token prices, context, modality, and High Usage classification.
- [Ollama GLM-5.3 Flash](https://ollama.com/library/glm-5.3-flash) and [tags](https://ollama.com/library/glm-5.3-flash/tags) — direct cloud token prices, context, modality, and Medium Usage classification.
- [Ollama DeepSeek V4 Flash](https://ollama.com/library/deepseek-v4-flash) and [tags](https://ollama.com/library/deepseek-v4-flash/tags) — direct cloud token prices, context, modality, and Medium Usage classification.
- [Ollama Kimi K3](https://ollama.com/library/kimi-k3) and [tags](https://ollama.com/library/kimi-k3/tags) — direct cloud token prices, context, modality, and Extra High Usage classification.
- [Ollama Gemma 4](https://ollama.com/library/gemma4%3Acloud) and [tags](https://ollama.com/library/gemma4/tags) — direct cloud token prices and the `gemma4:31b-cloud` Low Usage classification.
- [Ollama pricing](https://ollama.com/) — current plan structure and included-usage framing; local models remain free.

### Limitations

Scores are not interchangeable across benchmark versions, reasoning settings, providers, or harnesses. Artificial Analysis v4.3 changed benchmark components from v4.2, so score changes are not pure model regressions or improvements. OpenRouter and Ollama prices can change by provider, region, context tier, cache behavior, and availability. Ollama's usage classes are relative labels, not a conversion formula for the account's session or weekly percentage. The shortlist includes capability/value candidates without a comparable current AA composite score or routed price; those cells are explicitly marked. Validate privacy, licensing, rate limits, tool behavior, and production latency separately.
