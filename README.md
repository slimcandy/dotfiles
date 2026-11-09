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

4. Local coding agent. Open LM Studio once so it creates `~/.lmstudio`, then:

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
pi/                               -> ~/.pi/agent/: pi with the local Qwen3.6-35B-A3B model
lmstudio/*.json                   -> ~/.lmstudio/.internal/user-concrete-model-default-config/lmstudio-community/
Brewfile                          brew formulae, casks, VSCodium extensions, global npm packages
```

Telemetry is off everywhere it can be set from config: the fish env file above,
`DISABLE_TELEMETRY` / `DISABLE_ERROR_REPORTING` in Claude Code, `telemetry.telemetryLevel` in VSCodium.
GUI apps (Steam, Screen Studio, ...) are set in their own preferences.

## Local coding agent

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

## Updates

- Apps: `brew upgrade`. Refresh the list with `brew bundle dump --file Brewfile --force`;
  `brew bundle cleanup --file Brewfile` shows what's installed but not listed.
- Claude Code plugins update on their own: the marketplace has `autoUpdate`, and
  `FORCE_AUTOUPDATE_PLUGINS=1` overrides `DISABLE_AUTOUPDATER=1`.
- Config files are copied by hand. pi packages: `pi update --extensions`.
