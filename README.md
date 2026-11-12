# dotfiles

My dev setup: Homebrew apps, Claude Code (plugin marketplace + config), VSCodium and a local coding agent (pi + LM Studio).

## New machine

1. Clone and install apps, VSCodium extensions and global npm packages:

   ```sh
   git clone https://github.com/slimcandy/dotfiles.git
   brew bundle --file dotfiles/Brewfile
   ```

   Not in brew: the MonoLisa Nerd Font (paid), install it by hand.

2. Copy config files:

   ```sh
   cp dotfiles/claude/settings.json dotfiles/claude/statusline.js ~/.claude/
   cp dotfiles/vscodium/settings.json ~/Library/Application\ Support/VSCodium/User/
   cp -R dotfiles/fish/ ~/.config/fish/
   cp dotfiles/starship/starship.toml ~/.config/
   netlify --telemetry-disable   # netlify keeps this in its own config, not in env
   ```

3. Install the Claude Code plugins:

   ```sh
   claude plugin marketplace add slimcandy/dotfiles
   claude plugin install kit@slimcandy
   claude plugin install quiet-tools@slimcandy
   ```

4. Local coding agent, **Mac mini M4 Pro, 64 GB only**. On the MacBook Pro M2 with 16 GB, follow
   [MacBook Pro M2, 16 GB](#macbook-pro-m2-16-gb) instead. Open LM Studio once so it creates `~/.lmstudio`, then:

   ```sh
   ~/.lmstudio/bin/lms bootstrap   # adds the lms command
   lms get https://huggingface.co/lmstudio-community/Qwen3.6-35B-A3B-MLX-6bit -y
   mkdir -p ~/.pi/agent && cp -R dotfiles/pi/ ~/.pi/agent/
   mkdir -p ~/.lmstudio/.internal/user-concrete-model-default-config/lmstudio-community
   cp dotfiles/lmstudio/Qwen3.6-35B-A3B-MLX-6bit.json ~/.lmstudio/.internal/user-concrete-model-default-config/lmstudio-community/
   ```

   Then run `pi` in a project folder. LM Studio loads the model on the first request.

## Layout

```
.claude-plugin/marketplace.json   marketplace "slimcandy" (must stay at the repo root)
claude/plugins/kit/               plugin "kit": sound hooks, skill repo-style
claude/plugins/quiet-tools/       mod: each tool call drawn as "<icon> <description>", output under ctrl+o
claude/settings.json              -> ~/.claude/settings.json
claude/statusline.js              -> ~/.claude/statusline.js (needs a Nerd Font)
vscodium/settings.json            -> ~/Library/Application Support/VSCodium/User/settings.json
fish/config.fish                  -> ~/.config/fish/config.fish
fish/conf.d/no-telemetry.fish     -> ~/.config/fish/conf.d/: telemetry opt-outs (brew, gh, Next.js, ...)
starship/starship.toml            -> ~/.config/starship.toml (needs a Nerd Font)
pi/                               -> ~/.pi/agent/: pi with the local Qwen3.6-35B-A3B model (Mac mini, 64 GB)
lmstudio/*.json                   -> ~/.lmstudio/.internal/user-concrete-model-default-config/lmstudio-community/
mbp-m2-16gb/                      MacBook Pro M2, 16 GB only: Mellum2.1 configs for pi and LM Studio
Brewfile                          brew formulae, casks, VSCodium extensions, global npm packages
```

Telemetry is off everywhere it can be set from config: the fish env file above,
`DISABLE_TELEMETRY` / `DISABLE_ERROR_REPORTING` in Claude Code, `telemetry.telemetryLevel` in VSCodium.
GUI apps (Steam, Screen Studio, ...) are set in their own preferences.

## Local coding agent

This section is for the **Mac mini M4 Pro with 64 GB**. The 16 GB MacBook Pro has its own setup below.

[pi](https://github.com/earendil-works/pi) runs on **Qwen3.6-35B-A3B** (MLX, 6-bit, 29 GB) served by LM Studio
on `127.0.0.1:1234`. In a 30-minute benchmark on a Mac mini M4 Pro with 64 GB it was the only local setup that
built a whole Next.js site from one prompt (12 minutes). Qwen3.8-27B was 4× slower, and gpt-oss-20b broke its tool calls.

- `pi/models.json`: the LM Studio connection and the model. Context window 98,304 tokens, 32,768 output tokens,
  and Qwen's recommended sampling (temperature 0.6, top_p 0.95, top_k 20), which pi sends with every request.
  `supportsDeveloperRole: false`, because Qwen's chat template has no developer role.
- `pi/settings.json`: this model is the default, with thinking level medium. `packages` lists npm packages,
  which pi installs on its first start:
  - [`pi-web-access`](https://www.npmjs.com/package/pi-web-access): web search, page fetch and PDF text,
    no API key needed. Searches go to Exa's hosted service by default.
  - [`cc-safety-net`](https://www.npmjs.com/package/cc-safety-net): blocks `rm -rf`, `git reset --hard`,
    `git push --force`, `curl … | bash`, and reading `.env` files or SSH keys.
- `pi/mcp.json`: the Safari MCP. Enable it once: Safari → Settings → Advanced → Show features for web developers,
  then Develop → Allow Remote Automation, then `safaridriver --enable`.
- `pi/extensions/`:
  - `todo`, `plan-mode` (`/plan` or Ctrl+Alt+P: read-only exploration, then a plan to approve) and
    `questionnaire` (multiple-choice questions to you), copied from pi's examples (MIT).
  - `sound.ts`: the same sounds as the Claude Code `kit` plugin. Hero plays when pi finishes,
    Blow when it asks a question.
- No subagents. On one GPU with one model they take turns instead of working in parallel, and there's no
  cheaper model to hand work to. In the benchmark, the run with subagents broke the page and took
  29 minutes; the winning run (12 minutes) used none.
- Claude Code agents become pi skills that point at the agent file, so the instructions live in one place.
  Put `.pi/skills/<name>/SKILL.md` in the project:

  ```markdown
  ---
  name: linkedin-post-writer
  description: "Writes LinkedIn posts … Use when asked for a LinkedIn post."
  ---

  Read `../../../.claude/agents/linkedin-post-writer.md` (relative to this skill's folder) and follow it,
  ignoring its frontmatter. It was written as a Claude Code subagent; here you do the work yourself.
  ```

  Quote the description: a `: ` inside it breaks the frontmatter and pi skips the skill silently.
  Claude Code commands become `.pi/prompts/<name>.md` the same way. pi asks once to trust a project's `.pi/` folder.
- `lmstudio/Qwen3.6-35B-A3B-MLX-6bit.json`: LM Studio's per-model load settings, the same as the gear icon
  in My Models. It sets a 98,304-token context, so a model that LM Studio loads on demand matches pi.
  Without it, LM Studio's global default of 8,192 tokens applies and long sessions break.
  Sampling isn't set here: it only affects LM Studio's own chat window, because pi sends its own with every request.
  `.internal` is LM Studio's own folder, so the path may change in a later version.

Rules:

- Load one model at a time. macOS gives the GPU about 75% of RAM, and a second model next to this one
  crashes with "Insufficient Memory".
- Thinking is always on. LM Studio ignores the off switch for this model, and Qwen3.6 has no effort levels.
- On a 36–48 GB Mac, use the 4-bit build (20.4 GB) instead of the 6-bit one. Then rename the file in `lmstudio/` to match.

### MacBook Pro M2, 16 GB

**Not for the Mac mini.** The 13" MacBook Pro (2022, base M2, 100 GB/s memory bandwidth) can't hold Qwen3.6-35B-A3B,
and a dense 9B model there is slow (about a minute before the first token on an 8k-token prompt) and pushes macOS
into swap at long context. pi runs on
[Mellum2.1-12B-A2.5B-Thinking](https://huggingface.co/JetBrains/Mellum2.1-12B-A2.5B-Thinking) (JetBrains,
Apache 2.0) instead. It's a mixture-of-experts model with 2.5B active parameters, so it processes prompts about
3× faster than a dense 9B, and JetBrains benchmarked it with pi (SWE-bench Verified 47.0).

Build: [imaadd05/Mellum2.1-12B-A2.5B-Thinking-mlx-nvfp4](https://huggingface.co/imaadd05/Mellum2.1-12B-A2.5B-Thinking-mlx-nvfp4)
(MLX NVFP4, 6.8 GB, chat template identical to JetBrains' original). NVFP4 rather than MXFP4: it stays closer to
the original model (lower KL divergence on tool calls) and is only about 5% slower. The 6-bit build (9.9 GB) is too
big for 16 GB.

Do steps 1–3 of [New machine](#new-machine) as usual, then instead of step 4:

```sh
~/.lmstudio/bin/lms bootstrap
lms get https://huggingface.co/imaadd05/Mellum2.1-12B-A2.5B-Thinking-mlx-nvfp4 -y
lms ls   # the model id must match "id" in mbp-m2-16gb/pi/models.json; fix it there if not
mkdir -p ~/.pi/agent && cp -R dotfiles/pi/ ~/.pi/agent/   # extensions
cp dotfiles/mbp-m2-16gb/pi/*.json ~/.pi/agent/            # replaces the Mac mini models/settings
mkdir -p ~/.lmstudio/.internal/user-concrete-model-default-config/imaadd05
cp dotfiles/mbp-m2-16gb/lmstudio/*.json ~/.lmstudio/.internal/user-concrete-model-default-config/imaadd05/
```

Settings (`mbp-m2-16gb/`):

- Context **49,152 tokens**, 16,384 output tokens per turn (as in JetBrains' pi benchmark). Mellum keeps only a
  1,024-token window in 21 of 28 layers, so its context costs about 14 KB per token: peak memory is about 8 GB.
  A 32k window would leave only 16k for the conversation after the output reserve.
- **Parallel sessions 1.** LM Studio's default reserves memory for 4 conversations; pi only runs one.
- Sampling as in JetBrains' pi benchmark ("each model's default sampling, temperature 1.0"): temperature 1.0 and
  everything else neutral (top_p 1.0, top_k 0 = off, min_p 0, repeat_penalty 1.0). They're set explicitly
  because LM Studio fills any missing field from its own chat presets. JetBrains' 0.6 / 0.95 / 20 is for chat only.
- Thinking is always on. The template has an `enable_thinking` switch but no effort levels, and LM Studio ignores
  every way of turning it off (`reasoning_effort: "none"`, `enable_thinking`, `chat_template_kwargs`; tested with
  Qwen3.6, which has the same switch). So `supportsReasoningEffort: false`. Earlier thinking stays in the history:
  LM Studio returns it as `reasoning_content`, pi sends it back the same way, and the template reads that field.
- KV cache quantization stays off: it's experimental in LM Studio and would save only about 0.3 GB here.
- Close Docker and spare browsers during long sessions: the model needs about 8 GB of the 16.

If pi stops after a turn without running the tool it announced, the MLX engine dropped a tool call it couldn't
parse. Switch to the GGUF Q4_K_M build of the same model.

## Updates

- Apps: `brew upgrade`. Refresh the list with `brew bundle dump --file Brewfile --force`;
  `brew bundle cleanup --file Brewfile` shows what's installed but not listed.
- Claude Code plugins update on their own: the marketplace has `autoUpdate`, and
  `FORCE_AUTOUPDATE_PLUGINS=1` overrides `DISABLE_AUTOUPDATER=1`.
- Config files are copied by hand. pi packages: `pi update --extensions`.
