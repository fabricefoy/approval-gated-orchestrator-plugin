Date: 2026-10-04
Version: 1.16

# Model Routing Guide

This is a point-in-time routing guide for public model APIs and hosted model catalogs. “Latest” means the newest model family or release visible in the sources below on 2026-10-03. Provider-specific snapshots retain their own stated dates. Recheck before making a production choice.

Prompting guidance for covered models is maintained separately in [`prompting.md`](prompting.md). This guide covers routing evidence, model capabilities, costs, and execution lanes.

## Model Routing

### Benchmark basis

The main comparison source is Artificial Analysis Intelligence Index v4.3.2. In this snapshot it combines ten evaluations: AA-Briefcase v1.1, GDPval-AA v2.1, AutomationBench-AA, Terminal-Bench 4.0, SciCode, Humanity’s Last Exam, GDP.pdf, CritPt, AA-Omniscience, and AA-LCR v1.1. These cover agentic knowledge work, professional tasks, SaaS automation, terminal coding, science, physics, document reasoning, knowledge/grounding, and long-context reasoning. The current release feed also exposes capability-specific evidence for newer September releases such as Gemini 4 Argon, GPT-6.1 Sol, Claude Sonnet 5.5, Claude Opus 5.5, GPT-6 Luna, Grok 4.7, MiMo-V2.6 Flash/Pro, Step 5 Preview, and DeepSeek V4.1 Flash.

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

The table below uses the public OpenRouter catalog rechecked on 2026-10-03 as a comparable hosted-routing snapshot. Values are USD per 1 million blended tokens using a 3:1 input-to-output mix: `0.75 × input price + 0.25 × output price`. They are not a promise of direct-provider pricing, availability, or latency. Cost bands are: low `< $0.50`, middle `$0.50–$3.00`, expensive `> $3.00`.

“AA v4.3.2 score” is the current Artificial Analysis Intelligence Index where a score was visible in the snapshot. A dash means the model was included as a current specialist/value candidate but did not have a comparable current composite score; it is not a zero.

### Best-50 current shortlist

This is a capability-balanced shortlist, not a claim that one scalar leaderboard settles every workload. It is ordered roughly by measured general intelligence, then by capability coverage and cost-efficient alternatives. Newly released September models are retained in the lower half to minimize churn in existing row references; row number is not a claim of exact rank. GPT-5.6 Sol, Terra, and Luna remain intentionally listed for backward-compatible routing. Routed prices were checked for all 50 entries; a dash marks a model that was not present in the current public routed catalog.

| # | Model / provider | Evidence | Blended $/M | Cost | Performance for best-fit work | Best-fit capabilities |
|---:|---|---:|---:|---|---|---|
| 1 | Claude Fable 5.1 / Anthropic | AA v4.3.2 53 | 20.00 | Expensive | High | C1, C5, C6 |
| 2 | GPT-6 Astra / OpenAI | AA v4.3.2 53 | 20.00 | Expensive | High | C1, C2, C4, C6 |
| 3 | Claude Opus 5 / Anthropic | AA v4.3.2 50.8 | 10.00 | Expensive | High | C1, C2, C4, C5 |
| 4 | Claude Fable 5 / Anthropic | AA v4.3.2 49.6 | 20.00 | Expensive | High | C1, C5, C6 |
| 5 | Muse Spark 1.3 / Meta | AA v4.3.2 48 | 2.00 | Middle | High | C4, C8 |
| 6 | GPT-5.6 Sol / OpenAI | AA v4.3.2 47.0 | 4.00 | Expensive | High | C1, C2, C6 |
| 7 | Grok 4.6 / xAI | AA v4.3.2 44.3 | 3.00 | Middle | High | C1, C6, C8 |
| 8 | Kimi K3 / Moonshot AI | AA v4.3.2 44 | 5.40 | Expensive | High | C1, C2, C5 |
| 9 | GLM-5.3 / Z AI | AA v4.3.2 45 | 2.15 | Middle | High | C1, C2, C3 |
| 10 | Gemini 3.8 Flash / Google | AA v4.3.2 41 | 1.50 | Middle | High | C4, C5, C6 |
| 11 | GPT-5.6 Terra / OpenAI | AA v4.3.2 42 | 4.50 | Expensive | High | C2, C3, C4, C6 |
| 12 | Qwen3.8 2.4T A95B / Alibaba | AA v4.3.2 40 | 3.00 | Middle | High | C1, C2, C5 |
| 13 | GLM-5.3 Flash / Z AI | AA v4.3.2 42 | 0.24 | Low | High | C2, C7, C9 |
| 14 | GPT-5.6 Luna / OpenAI | AA v4.3.2 37.3 | 0.45 | Low | High | C7, C8, C9 |
| 15 | DeepSeek V4 Pro 0813 / DeepSeek | AA v4.3.2 36 | 0.99 | Middle | High | C1, C2, C3 |
| 16 | Qwen3.8 27B / Alibaba | AA v4.3.2 34 | 1.06 | Middle | High | C2, C7, C9 |
| 17 | Gemini 3.7 Flash / Google | AA v4.3.2 39.1 | 1.50 | Middle | High | C4, C6, C8 |
| 18 | Claude Sonnet 5.5 / Anthropic | AA v4.3.2 56 | 4.00 | Expensive | High | C2, C7, C8 |
| 19 | Grok 4.5 / xAI | AA v4.3.2 38.8 | 3.00 | Middle | High | C1, C8 |
| 20 | Qwen3.8 Max / Alibaba | AA v4.3.2 45 | 3.00 | Middle | High | C1, C5, C6 |
| 21 | Qwen3.8 Flash / Alibaba | — | 0.23 | Low | Middle | C7, C8, C9 |
| 22 | Qwen3.7 Max / Alibaba | AA v4.3.2 29.5 | 2.21 | Middle | High | C1, C2, C5 |
| 23 | Qwen3.7 Plus / Alibaba | AA v4.3.2 25.2 | 0.56 | Middle | High | C2, C7 |
| 24 | Qwen3.7 Flash / Alibaba | — | 0.06 | Low | Middle | C7, C9 |
| 25 | Gemini 3.6 Flash / Google | AA v4.3.2 34 | 1.50 | Middle | High | C4, C6, C8 |
| 26 | Gemini 4 Argon / Google | AA v4.3.2 53 | — | — | High | C1, C4, C5, C6 |
| 27 | Step 5 Preview / StepFun | AA v4.3.2 44 | — | — | High | C1, C2, C3, C5 |
| 28 | Gemini 3.1 Pro Preview / Google | AA v4.3.2 29.7 | 4.50 | Expensive | High | C1, C3, C5 |
| 29 | Claude Sonnet 4.6 / Anthropic | AA v4.3.2 30.1 | 6.00 | Expensive | High | C2, C7, C8 |
| 30 | GPT-5.3 Codex / OpenAI | — | 4.81 | Expensive | High | C2, C6 |
| 31 | DeepSeek V4 Pro / DeepSeek | AA v4.3.2 30.4 | 0.26 | Low | High | C1, C2, C3 |
| 32 | DeepSeek V4 Flash / DeepSeek | AA v4.3.2 24.2 | 0.04 | Low | Middle | C2, C7, C9 |
| 33 | DeepSeek V4 Flash 0731 / DeepSeek | AA v4.3.2 34.3 | 0.33 | Low | High | C2, C7, C9 |
| 34 | GLM-5.2 / Z AI | AA v4.3.2 33.7 | 1.30 | Middle | High | C2, C3, C5, C6 |
| 35 | MiniMax-M3 / MiniMax | AA v4.3.2 29.2 | 0.52 | Middle | High | C1, C2, C8 |
| 36 | MiMo-V2.5 Pro / Xiaomi | AA v4.3.2 26 | 0.54 | Middle | High | C2, C3 |
| 37 | MiMo-V2.6 Flash / Xiaomi | AA v4.3.2 38 | 0.18 | Low | High | C2, C4, C7, C9 |
| 38 | Qwen3.8 Flash Next / Alibaba | AA v4.3.2 40 | — | — | High | C4, C7, C9 |
| 39 | DeepSeek V4 Flash Vision / DeepSeek | AA v4.3.2 35 | 0.32 | Low | High | C4, C7, C9 |
| 40 | Claude Opus 5.5 / Anthropic | AA v4.3.2 58 | 8.00 | Expensive | High | C1, C2, C5, C6 |
| 41 | Muse Spark 1.2 / Meta | AA v4.3.2 39.6 | 2.00 | Middle | High | C4, C8 |
| 42 | Llama 4 Maverick / Meta | — | 0.30 | Low | Middle | C4, C8, C9 |
| 43 | GPT-6.1 Sol / OpenAI | AA v4.3.2 52 | 4.00 | Expensive | High | C1, C2, C6 |
| 44 | Mistral Medium 3.5 / Mistral | AA v4.3.2 14.2 | 3.00 | Middle | Middle | C2, C8 |
| 45 | Devstral 2 / Mistral | AA v4.3.2 8.6 | 0.80 | Middle | High | C2, C9 |
| 46 | GPT-6 Luna / OpenAI | AA v4.3.2 38 | 0.20 | Low | High | C7, C8, C9 |
| 47 | Grok 4.7 / xAI | AA v4.3.2 46 | 3.00 | Middle | High | C1, C2, C6, C8 |
| 48 | gpt-oss-120b / OpenAI | — | 0.07 | Low | Middle | C2, C7, C9 |
| 49 | MiMo-V2.6 Pro / Xiaomi | AA v4.3.2 46 | 0.54 | Middle | High | C2, C3, C4 |
| 50 | DeepSeek V4.1 Flash / DeepSeek | AA v4.3.2 39 | 0.52 | Middle | High | C2, C7, C9 |

### GLM-5.2 focused analysis

GLM-5.2 is a strong open-weight text reasoning option rather than a general multimodal model. Artificial Analysis reports an Intelligence Index score of about 34, 71.8 output tokens/second, a 1M-token context window, 753B total parameters with 40B active per token, and an MIT license. The page marks it deprecated and recommends GLM-5.3 for new work. Its input modality is text only, so do not route image, chart, or document-vision work to it without a separate extraction stage.

The direct pricing snapshot is $1.40 per 1M input tokens and $4.40 per 1M output tokens, which is $2.15/M under the guide’s 3:1 blend. The current OpenRouter routed catalog lists approximately $0.41/$3.99 input/output, or $1.30/M blended. That makes GLM-5.2 a middle-cost, high-performance candidate for agentic coding, technical reasoning, long-context text synthesis, and tool workflows, especially when open weights or deployment control matter. Because the benchmark page now marks it deprecated, prefer GLM-5.3 for new work when its newer release and task-specific evals outperform GLM-5.2; retain GLM-5.2 when its measured quality, license, or deployment path is the better fit.

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
| High | GPT-6 Luna, GPT-5.6 Luna, GLM-5.3 Flash, DeepSeek V4 Flash 0731 for bounded or cost-sensitive work | Gemini 3.8 Flash, GLM-5.3, Grok 4.7, MiMo-V2.6 Pro, Qwen3.8 for strong general/value routing | Claude Opus 5.5, GPT-6 Astra, Claude Fable 5.1, GPT-6.1 Sol, GPT-5.6 Sol for frontier reasoning, agentic coding, and high-risk work |
| Middle | Qwen3.7 Flash, MiMo-V2.5, gpt-oss-120b for extraction, batch transforms, or local/open-weight paths | Qwen3.7 Plus, MiniMax-M3, MiMo-V2.5 Pro, MiMo-V2.6 Pro, DeepSeek V4.1 Flash, Devstral 2 for balanced production workloads | Claude Sonnet 5.5, GPT-5.6 Terra, GPT-5.3 Codex, Gemini 3.1 Pro when a specific modality or tool path justifies the price |
| Low | Do not select solely on price; reserve for non-critical drafts or fallback traffic | Use only after a local eval demonstrates acceptable quality and failure cost | Avoid; high spend does not compensate for a capability mismatch |

### Practical router

1. Classify the request into C1–C9 and mark it low or high complexity.
2. Set the minimum acceptable performance. For high-complexity work, start in the high row; for low-complexity work, start in middle or high performance at low cost.
3. Select the cheapest model in the qualifying cell with the required modality, context, data residency, and tool support.
4. Set model effort and output limits to the task, not to the model’s maximum. Keep machine outputs schema-constrained.
5. Escalate one tier when the model misses an acceptance criterion, cannot ground a claim, or exhausts its context/tool budget. Record the failure reason.
6. Periodically rerun the same eval set. Replace a route only when quality, cost, latency, availability, or policy evidence changes.

### Cross-platform task reuse and naming

Before creating a task or session, search active, idle, pinned, archived, and locally registered tasks. Reuse, resume, or unarchive an exact match; never create a duplicate. The reuse identity is execution platform, provider or backend route, exact model, reasoning level, exact project, and role. Use `⭐O|<Model> [<Reasoning>]|<Route>|<Platform>` for orchestrators, `💡A|<Model> [<Reasoning>]|<Route>|<Platform>` for advisors, and the unprefixed `<RoleCode>|<Model> [<Reasoning>]|<Route>|<Platform>` form for executors and reviews. The emoji immediately precedes `O` or `A` with no space. Examples are `⭐O|GPT-6 Astra [High]|OpenAI|Codex`, `💡A|GPT-6 Astra [High]|OpenAI|Codex`, `E|GLM 5.3 [High]|Ollama|Codex`, and `E|GLM 5.3 [High]|Ollama|OpenCode`. The emoji is visible-title metadata, not part of reuse identity; reuse and rename an otherwise exact legacy task rather than creating a duplicate. Codex project folders provide the visible project context, but the saved project identity or canonical path remains part of duplicate detection. If a platform does not expose routing details, use a truthful managed label instead of inventing them.

## Refresh and Maintenance

The companion `model-routing-refresh` skill reads this document first, then refreshes the benchmark methodology, 50-model shortlist, and price snapshot. Prompting guidance is maintained separately with `$prompting-refresh`.

### External execution lanes: OpenCode and Devin (verified 2026-09-17)

Native Codex remains the default. OpenCode and Devin are delegation surfaces, not models in the native Codex selector. Use them only when the lane has a concrete advantage over native execution.

| Lane | Prefer when | Pre-dispatch usage check | Selection status |
|---|---|---|---|
| OpenCode MCP 3.0.0 | A named OpenCode provider/model is requested; bounded work should stay local; local background execution helps | `codexbar usage --provider opencode`; also `codexbar usage --provider opencodego` when relevant | Provider, model, variant, and session title are selectable. OpenCode 1.18.31 at `127.0.0.1:4096` is healthy and configured to auto-start; still run setup/health before dispatch. |
| Devin handoff 1.4.0 | A cloud VM, browser, Docker, running service, long CI, or independent long-running execution is needed | `codexbar usage --provider devin` | Devin API v3 access through a dedicated Member service user is validated. The handoff creates and polls sessions but does not expose model or reasoning selection. |

Hard rules:

1. Select the lowest-cost lane, model, and reasoning level that can meet the acceptance criteria. Escalate only after a concrete capability failure.
2. Missing or ambiguous CodexBar output is unknown, never zero. As of 2026-09-17, `codexbar usage --provider opencode` reports an ambiguous `Cost: 111.0 / 0.0`; do not interpret that as available or exhausted quota without provider confirmation.
3. OpenCode uses one model per session. Follow the cross-platform reuse identity and naming convention above; a different platform, route, model, reasoning level, project, or role gets a different session. Preserve job/session IDs, and never resubmit merely because a wait timed out.
4. Before OpenCode work, verify the server, provider/model availability, absolute project directory, owned files, checks, and stop condition. Its configured auto-start is normal operation; if setup/health still fails, do not manually repair the service without authorization. Use a separate worktree if another actor may edit the checkout. Review changes before integration.
5. Before Devin work, verify the remote and branch, inspect tracked changes for secrets or unrelated work, and remember that untracked files are not included while up to 100 KB of tracked uncommitted changes may be transmitted. Record the session URL/ID and inspect the returned branch, commit, PR, tests, and evidence before acceptance.
6. The current Devin wrapper cannot enforce the requested one-model-per-session naming rule because it cannot select or confirm a model or reasoning level. Use a provider-confirmed model label only when a dispatch surface exposes and verifies that selection; otherwise label the executor as Devin-managed rather than inventing a model.
7. “GLM 5.2 High reasoning, non-1M, is free on Devin” is currently user-reported and unverified by the installed API wrapper. Treat it as a pricing lead to verify at dispatch time, not as a hard default or confirmed zero-cost route. The same live-verification rule applies to other Devin prices.
8. Never send credentials, broaden scope, or let multiple agents modify the same checkout. Do not merge, deploy, push, archive, or approve destructive actions without the corresponding authorization.

#### Devin local CLI lane (verified from the CLI, 2026-09-17)

The `devin` CLI on the Mac is a third lane, distinct from the cloud handoff above, and it *does* expose model
selection — so the one-model-per-session rule is enforceable there (rule 6 above applies only to the cloud
handoff wrapper).

- `devin -r <session-id> --model <id> -p --prompt-file <file>` resumes a named local session non-interactively;
  without `--model` the session keeps its saved model. `devin list` / `~/.local/share/devin/cli/sessions.db`
  hold the id, title, model and working directory. A session open in Devin Desktop holds a lock and the
  dispatch fails with `session_locked` until that window is closed.
- `--permission-mode`: `auto` (read-only) stalls a build task at its first write; `dangerous` auto-approves all
  tools and is what an unattended build block needs. Ask the owner before using it.
- Prices from `devin models list` on 2026-09-17: **SWE-2 (`swe-2-high`/`-medium`/`-max`, 262K) is Free**;
  GLM 5.3 Flash `glm-5-3-flash-high` $0.15/$0.5 per 1M (1M context); GLM 5.2 `glm-5-2` $1.4/$4.4 per 1M — it is
  **not** free, contrary to the earlier user-reported lead. Recheck prices with `devin models list` at dispatch.
- Quota: `codexbar usage --provider devin`. One Prompt-41-sized block on GLM 5.2 took the daily allowance from
  64% to 0%, so run the check before every dispatch and prefer the free tier.

### Sources checked on 2026-10-03

- [OpenAI latest-model guidance](https://developers.openai.com/api/docs/guides/latest-model) — model IDs, reasoning levels, tool support, and model availability.
- [OpenAI pricing](https://developers.openai.com/api/docs/pricing?tab=suite) — current GPT-6 and GPT-5.6 input/output pricing and context-tier rules.
- [Prompting guidance for covered models](prompting.md) — separate, dated provider guidance and model-specific prompting notes.
- [Anthropic models overview](https://platform.claude.com/docs/en/models/overview) and [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) — current model IDs, capabilities, and direct token prices.
- [Artificial Analysis model comparison](https://artificialanalysis.ai/models) — Intelligence Index v4.3.2 methodology, benchmark families, rankings, and cost-per-task views.
- [Artificial Analysis model releases](https://artificialanalysis.ai/models/releases) — latest release families, category evidence, composite scores, context, and cost-per-task snapshot.
- [OpenRouter model API](https://openrouter.ai/api/v1/models) — routed model IDs and current input/output catalog prices used for the 3:1 blended-cost column.
- [SpaceXAI Grok 4.7](https://docs.x.ai/developers/models/grok-4.7) — model ID, modalities, context, reasoning levels, and direct pricing.
- [Artificial Analysis GLM-5.2 analysis](https://artificialanalysis.ai/models/glm-5-2) — current model-specific score, deprecation notice, class rank, speed, context, modality, license, and direct pricing.
- [Ollama GLM-5.3](https://ollama.com/library/glm-5.3%3Acloud) and [tags](https://ollama.com/library/glm-5.3/tags) — direct cloud token prices, context, modality, and High Usage classification.
- [Ollama GLM-5.3 Flash](https://ollama.com/library/glm-5.3-flash) and [tags](https://ollama.com/library/glm-5.3-flash/tags) — direct cloud token prices, context, modality, and Medium Usage classification.
- [Ollama DeepSeek V4 Flash](https://ollama.com/library/deepseek-v4-flash) and [tags](https://ollama.com/library/deepseek-v4-flash/tags) — direct cloud token prices, context, modality, and Medium Usage classification.
- [Ollama Kimi K3](https://ollama.com/library/kimi-k3) and [tags](https://ollama.com/library/kimi-k3/tags) — direct cloud token prices, context, modality, and Extra High Usage classification.
- [Ollama Gemma 4](https://ollama.com/library/gemma4%3Acloud) and [tags](https://ollama.com/library/gemma4/tags) — direct cloud token prices and the `gemma4:31b-cloud` Low Usage classification.
- [Ollama pricing](https://ollama.com/) — current plan structure and included-usage framing; local models remain free.

### Limitations

Scores are not interchangeable across benchmark versions, reasoning settings, providers, or harnesses. Artificial Analysis v4.3.2 changed benchmark components from v4.3, so score changes are not pure model regressions or improvements. OpenRouter and Ollama prices can change by provider, region, context tier, cache behavior, and availability. Ollama's usage classes are relative labels, not a conversion formula for the account's session or weekly percentage. The shortlist includes capability/value candidates without a comparable current AA composite score or routed price; those cells are explicitly marked. Validate privacy, licensing, rate limits, tool behavior, and production latency separately.
