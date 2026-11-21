---
name: concil
description: Convene read-only model advisors for a bounded decision, second opinion, or review when independent perspectives could change the outcome. Choose parallel review, sequential handoff, or a cost-aware cascade and synthesize findings against evidence.
---

# Concil

Resolve one decision with the smallest useful set of advisors. The orchestrator owns synthesis and the owner retains decision and execution authority. Follow the [orchestrator skill](../approval-gated-orchestrator/SKILL.md) for guide selection, live routing checks, approval, exact session reuse, and report transport. Use the documented transport for the selected harness.

## Choose the review format

| Format | When to use it | How to run it |
| --- | --- | --- |
| Independent panel | Two perspectives could materially change a difficult or costly decision. | Start with two complementary advisors. Give both the same question, evidence and decision criteria, plus a distinct review angle. Run in parallel where supported and keep first reports private from other advisors until both arrive. If the harness requires serial dispatch, retain the same independence. Follow with the two exchange rounds below. |
| Cascade | One scoped review may resolve the question. | Start with the least costly capable advisor. Stop when the agreed evidence checks pass. Escalate only for a named unresolved risk, missing decisive evidence an advisor can obtain, or a demonstrated capability gap. Fix context or access first. |
| Sequential handoff | The next advisor needs an artifact the first must produce, such as a shortlist or evidence table. | Pass the artifact, its sources, and one specific follow-up question. Ask the second advisor to check its assumptions. Treat the results as dependent assessments. |

Write the stop condition before dispatch. Use a third advisor only for a material disagreement that evidence checks could not settle, a distinct missing perspective, or an owner-requested panel size. Keep the third advisor's assignment bounded.

## Pick the models and effort

Compare at least two viable model and harness combinations for each proposed advisor, or explain why only one is viable. Consider required tools and modality, exact route availability, live quotas, expected cost and latency, retry and verification cost, and what a distinct provider adds. Keep the comparisons and quotas in the orchestrator's record. Use the lowest effort that fits each advisor's question and verify the setting on that exact route. Effort labels are local to the model and harness.

Example candidates for a difficult architecture decision, subject to live checks and approval:

- **GPT-6.2 Astra at High** for resolving interacting design constraints and comparing alternatives.
- **Claude Fable 5.2 at Medium** for an independent critique of assumptions and failure cases. Consider High if the evidence review is genuinely demanding.
- **Gemini 4 Neon at Low** through native Antigravity ACP for a tightly scoped evidence check. Use Medium when the check requires more analysis. Confirm the model and thinking level before dispatch, including after resume.

These are example assignments. Swap candidates or use fewer based on the task and available routes. Distinguish Gemini 4 Neon from Orchestrator (Neon). Apply model-specific prompt guidance only to the exact documented model and integration. Use the shared advisor brief when the canonical guide does not cover that route.

## Brief and dispatch

Present the owner with the format, stop condition, planned spend or quota limit, exact advisor routes and efforts, reuse results, approved evidence boundaries, and frozen briefs. For a panel, include the two exchanges, their prompts, and which findings may be relayed to each route. Budget one turn per advisor per exchange. Obtain explicit approval for the named dispatches. A conditional cascade may be approved up front when the next route, prompt, trigger, and budget are fixed. Recheck live routing before each dispatch. If a material change is needed, present an amendment for approval. Use a manual brief if the route is unavailable and identify any missing review.

```text
Role: Read-only advisor. Review independently.
Decision: [one question and the options, if applicable]
Review angle: [one assignment, such as evidence quality or failure modes]
Evidence: [common approved sources, revision or date, and access limits]
Criteria: [what would support or overturn a recommendation]
Boundaries: [allowed reads and tools, no edits or redelegation]
Return: Recommendation, strongest supporting evidence, strongest objection,
        uncertainty, and one check that could change your conclusion.
Report destination: [approved transport and recipient]
```

Reference accessible authoritative files. Include only essential excerpts where the approved route cannot read the originals. Keep prior recommendations out of first-pass briefs. When reusing a session that has already seen them, disclose the loss of independence instead of creating a duplicate. Keep the report brief and ask for checkable evidence and a concise rationale.

## Exchange findings twice

After the independent reports, relay the approved peer findings through the orchestrator. Reuse each advisor's existing session. Give all advisors the same snapshot for each round and collect their replies before sharing the next snapshot. Include only relevant claims and evidence that may be shared with the receiving route.

1. **Challenge or build.** Ask each advisor to pick one consequential peer claim. Challenge it, agree with a checkable reason, or add a missing condition or counterexample. Ask what evidence would settle the point.
2. **Respond and revise.** Relay the relevant replies and ask each advisor to address the strongest objection to its position. Ask for its final recommendation, whether it changed, what evidence drove the change, and any remaining dissent.

Keep each reply to a few bullets. Finish after two exchanges, or report any shortened round if a route fails or the approved budget or time runs out. A cascade that resolves the question with one advisor can stop at its original condition.

## Synthesize

Compare claims against primary sources. Keep the independent reports distinct from agreement reached after discussion and note which conclusions changed on new evidence. Give evidence more weight than model count or model reputation. Report the recommendation, verified facts, material dissent, unresolved uncertainty, and one next action. End at advice unless the owner authorizes execution separately.

Workflow references: [Anthropic on parallelization and handoffs](https://www.anthropic.com/research/building-effective-agents), [FrugalGPT on cascades](https://arxiv.org/abs/2305.05176), and [research on agreement after model debate](https://arxiv.org/abs/2610.35930).

Model references: [GPT-6.2 Astra](https://developers.openai.com/api/docs/models/gpt-6.2-astra), [Claude Fable 5.2 prompting](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2), and [Antigravity model selection](https://antigravity.google/docs/models).
