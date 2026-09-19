# Optional Integrations

Read this reference only when evaluating a non-native route or advisor.

## Native Codex

Prefer native Codex tasks when they meet the acceptance criteria. Task discovery, creation, worktrees, monitoring, and report-back use the Codex environment's built-in task tools. They are not plugin dependencies.

## Live usage

CodexBar CLI is an optional external integration, not a plugin dependency. Point owners to the official [CodexBar project](https://github.com/steipete/CodexBar#install) and [CLI configuration guide](https://github.com/steipete/CodexBar/blob/main/docs/cli-configuration.md); do not vendor its binaries or configuration. Use it only when it is already installed and configured, with `codexbar usage --provider <provider> --format json`; do not install or configure it as an orchestration side effect. Never read or print its config, API keys, OAuth data, browser cookies, or provider tokens. A reliable native account-usage surface is equally valid. If no live reading is available, report usage as unknown. Never treat missing, ambiguous, or failed usage output as zero consumption or unlimited capacity.

## Ollama

Treat Ollama as a provider route, not automatically as the execution platform. A model selected inside Codex is titled like `E|GLM 5.3 Flash [High]|Ollama|Codex`; the same model in OpenCode is `E|GLM 5.3 Flash [High]|Ollama|OpenCode`.

### Codex macOS app

When the owner asks how to add Ollama models to the Codex macOS app, point to Ollama's official [ChatGPT Desktop integration guide](https://docs.ollama.com/integrations/chatgpt) and explain this path without executing it:

1. Use Ollama v0.34.0 or newer.
2. In the Ollama desktop app, open `Apps > ChatGPT (Desktop)` and turn it on.
3. Follow the prompts and restart the ChatGPT desktop app when requested.
4. Open ChatGPT desktop in Codex mode.
5. In Ollama, open `Settings > Apps > ChatGPT` and choose up to five compatible local or cloud models.

The selected Ollama models appear in Codex's model picker alongside native OpenAI models. Only requests using an Ollama model route through Ollama; regular Chat and voice use their usual providers, as do native Codex models.

### Codex CLI

The separate [Codex CLI integration guide](https://docs.ollama.com/integrations/codex) applies to terminal-based Codex setup. It is not the macOS app model-picker path above.

Do not install Ollama, start its service, sign in, alter Codex or Ollama configuration, or restore/remove an Ollama profile without explicit authorization.

## OpenCode

Use OpenCode only when installed and healthy and when local execution or its provider selection is a concrete advantage. Verify the exact project directory, provider, model, reasoning variant, owned files, checks, and stop condition. Do not repair or reconfigure its service without authorization.

## Devin

Use Devin Local or Cloud only when its runtime provides a concrete advantage. Before cloud handoff, inspect the exact transmitted repository state for secrets and unrelated changes and obtain explicit authorization. If a surface does not expose the model or reasoning level, use a truthful managed label rather than inventing one.

## Advisors

Oracle, Claude Companion, or another advisor is optional. Follow its installed skill when available. Keep advisory runs read-only unless the owner separately authorizes mutation, provider cost, or off-machine file transfer.
