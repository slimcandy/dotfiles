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
mbp-m2-16gb/                      MacBook Pro M2, 16 GB only: pi with LFM3-1.7B and Qwen3.5-4B, LM Studio configs
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

**Not for the Mac mini.** The 13" MacBook Pro (2022, base M2, 100 GB/s memory bandwidth) can't hold Qwen3.6-35B-A3B.
pi runs here as a full coding agent (read, write, edit, bash) on one of two small models:

| Model | In pi | Build | Size | Speed on the M2 | Memory during `next build` |
|---|---|---|---|---|---|
| [LFM3-1.7B](https://huggingface.co/LiquidAI/LFM3-1.7B) | default | [LiquidAI/LFM3-1.7B-MLX-4bit](https://huggingface.co/LiquidAI/LFM3-1.7B-MLX-4bit) | 1 GB | ~70 tokens/s | ~10 GB |
| [Qwen3.5-4B](https://huggingface.co/Qwen/Qwen3.5-4B) | fallback | LM Studio's staff pick `qwen/qwen3.5-4b`, MLX 4-bit | 3 GB | ~30 tokens/s | ~13 GB |

Speed and memory were measured on the Mac mini and scaled to the M2's memory bandwidth, not measured on the
MacBook. Memory is the whole Mac: about 5 GB for macOS, 1.5 GB for LM Studio, then the model, its context and the build.

**Give it small tasks.** Neither model builds a whole site from one long spec in under 30 minutes. In a test of
five small tasks on a finished Next.js site, one run each, both changed text across two files and fixed a type error
in 1–3 minutes. LFM3 also added an FAQ section (5–6 minutes) but couldn't restore one missing `</div>` or add a
region filter with state. Qwen3.5-4B did both of those (3 and 10 minutes) but not the FAQ. That's 3 of 5 against
4 of 5, within the noise of one run. Qwen3.5-4B ran with thinking on in that test; this config turns it off for speed.
LFM3 is the default: the same results at twice the speed and with 3 GB less memory. Liquid post-trained it for agent
harnesses, pi among them, but its model card also says it's "not recommended for agentic coding or complex
multi-step reasoning due to its small size". When LFM3 gets stuck on logic, switch to Qwen3.5-4B with `/model`.

Keep projects in folders without spaces in the path: small models write paths unquoted in shell commands and
end up writing to another folder.

Do steps 1–3 of [New machine](#new-machine) as usual, then instead of step 4:

```sh
~/.lmstudio/bin/lms bootstrap
lms runtime get omlx -y                                         # LFM3 runs only on LM Studio's oMLX engine
lms runtime select omlx-mac-arm64-apple-metal-advsimd --latest  # all MLX models now load with oMLX
lms get https://huggingface.co/LiquidAI/LFM3-1.7B-MLX-4bit -y
lms get qwen/qwen3.5-4b --mlx --select                          # pick 4-bit
lms ls   # ids must be lfm3-1.7b-mlx and qwen/qwen3.5-4b, as in mbp-m2-16gb/pi/models.json
mkdir -p ~/.pi/agent && cp -R dotfiles/pi/ ~/.pi/agent/         # extensions
cp dotfiles/mbp-m2-16gb/pi/* ~/.pi/agent/                      # replaces the Mac mini models/settings/MCP
mkdir -p ~/.lmstudio/.internal/user-concrete-model-default-config/LiquidAI
cp dotfiles/mbp-m2-16gb/lmstudio/LFM3-1.7B-MLX-4bit.json ~/.lmstudio/.internal/user-concrete-model-default-config/LiquidAI/
mkdir -p ~/.lmstudio/.internal/user-concrete-model-default-config/qwen
cp dotfiles/mbp-m2-16gb/lmstudio/qwen3.5-4b.json ~/.lmstudio/.internal/user-concrete-model-default-config/qwen/
```

Then open Qwen3.5-4B's settings in LM Studio (My Models → gear) and check that **Enable Thinking** is off.
Run `pi` in a project folder: LM Studio loads LFM3 on the first request. `/model` switches to Qwen3.5-4B, and
LM Studio unloads LFM3 first, because **Only Keep Last JIT Loaded Model** (Developer → Server Settings) is on
by default. Keep it on: both models loaded at once push memory into the yellow.

Settings (`mbp-m2-16gb/`):

- **LFM3-1.7B**
  - Thinking is always on: Liquid says turning it off "can be inconsistent". `reasoning: true` shows it in pi.
    `supportsReasoningEffort: false`, as in Liquid's pi guide, so pi doesn't send `reasoning_effort`, and the
    thinking level has no effect.
  - Sampling: Liquid's values for chat, tool use, agents and coding (temperature 0.1, top_k 50,
    repetition_penalty 1.1).
  - Context 65,536 tokens, 16,384 output tokens. Only 6 of the 24 layers keep the full history (13 are short
    convolutions, 5 see the last 256 tokens), so 64k of context costs about 0.8 GB.
  - MLX 4-bit on oMLX: about 70 tokens/s on the M2. LM Studio's standard MLX engine (mlx-llm) can't load the
    `lfm3` architecture. 8-bit would be about 40 tokens/s: on this Mac speed follows the bytes read per token.
- **Qwen3.5-4B**
  - **Thinking off**, in two places: `llm.prediction.reasoning.enableThinking: false` in the LM Studio file, and
    `reasoning: false` in pi. Thinking costs hundreds of tokens per turn before every tool call, which is most of
    the wait on this Mac. If pi still shows thinking blocks, switch it off by hand in My Models. The staff pick, not
    a Hugging Face URL: only it has LM Studio's "Enable Thinking" switch.
  - Sampling: Qwen's non-thinking values (temperature 0.7, top_p 0.8, top_k 20, min_p 0, presence_penalty 1.5,
    repetition_penalty 1.0), set explicitly because LM Studio fills any missing field from its own chat presets.
  - Context 65,536 tokens. 8 of the 32 layers keep the full history, so context costs 32 KB per token: 2 GB at 64k.
- Both: **parallel sessions 1** in the LM Studio files. LM Studio's default reserves memory for 4 conversations;
  pi only runs one. `supportsDeveloperRole: false`: neither chat template has a developer role.
- Tools: pi's defaults (read, bash, edit, write).
- `mcp.json`: Safari with `exposure: direct` and `autoEnableCodemode: false`. With codemode on, pi offers a tool
  that runs scripts, and a 4B model in a test sent it 479 empty calls instead of editing files.
- `APPEND_SYSTEM.md`: six short rules, each from a failure in the test: stay in the project folder and quote paths,
  run `npm install` before the build (`next: command not found`), change only the broken line (for one missing
  `</div>`, LFM3 made 9 edits and 36 shell calls and left the tags wrong), read the file again after a failed
  edit, one change at a time, stop and list the changes. With these rules LFM3 solved the same 3 of 5 tasks: they
  keep it in the project folder, but they don't fix its reasoning.

## Updates

- Apps: `brew upgrade`. Refresh the list with `brew bundle dump --file Brewfile --force`;
  `brew bundle cleanup --file Brewfile` shows what's installed but not listed.
- Claude Code plugins update on their own: the marketplace has `autoUpdate`, and
  `FORCE_AUTOUPDATE_PLUGINS=1` overrides `DISABLE_AUTOUPDATER=1`.
- Config files are copied by hand. pi packages: `pi update --extensions`.
