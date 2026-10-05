---
name: prompting-refresh
description: Refresh a user- or project-owned prompting guide for explicitly covered model families when official provider guidance changes.
---

# Prompting Refresh

Use this skill only when the owner explicitly requests or authorizes a prompting-guide refresh. Ordinary orchestration must not trigger it automatically.

## Target

Use the path named by the user or project instructions. Otherwise update `~/.codex/prompting.md`. If the target does not exist, use the plugin's bundled [prompting guide](../approval-gated-orchestrator/references/prompting.md) as the starting structure.

Do not edit the installed plugin's bundled guide. Refreshed output belongs in a user- or project-owned path.

## Workflow

1. Read the existing target, or the bundled guide when creating the target. Preserve useful scope boundaries and structure; update the date and increment the version.
2. Use live web research and prefer official provider documentation for the exact model or documented family being updated.
3. Keep OpenAI and Anthropic guidance separate. State exact model coverage and distinguish model behavior from API parameters, routes, and execution-harness behavior.
4. Keep shared advice explicitly limited to the covered models. Do not generalize to unlisted models or assume a harness preserves provider behavior.
5. Update model-specific exceptions only when current sources support them. Label API and harness constraints as such, not as prompt rules.
6. Include executor and read-only advisor templates that preserve scope and authority boundaries.
7. Date every source check, link directly to the source, and state freshness, integration, and coverage limitations.
8. Verify local links, headings, and the final diff. Do not update routing matrices, benchmarks, pricing, or execution-lane recommendations here.

## Required Output

The guide must contain:

- date and version;
- explicit exact-model and harness applicability boundaries;
- a shared checklist limited to covered models;
- separate provider guidance and concise model-specific exceptions;
- executor and read-only advisor templates;
- dated direct sources and limitations.

## Boundaries

Use public, credential-free sources. Do not expose API keys or private account data, create accounts, run paid calls, install integrations, modify unrelated files, or create duplicate schedules. Do not update routing guidance; use `$model-routing-refresh` for an explicitly authorized routing change.
