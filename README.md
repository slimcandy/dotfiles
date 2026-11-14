# dotfiles

My dev setup: Homebrew apps, Claude Code (plugin marketplace + config), VSCodium and a local coding agent (pi + Qwen3.6 on oMLX).

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

4. Local coding agent: [pi](https://github.com/earendil-works/pi) on Qwen3.6-35B-A3B, served by
   [oMLX](https://github.com/jundot/omlx) from the Mac mini to any Mac on the home Wi-Fi.
   See [Local coding agent](#local-coding-agent) for the server, the key and the MacBook.

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
pi/                               -> ~/.pi/agent/ on every Mac: pi with Qwen3.6-35B-A3B on the Mac mini's oMLX
omlx/                             Mac mini only: oMLX settings and setup.py, which merges them into ~/.omlx and makes keys
Brewfile                          brew formulae, casks, VSCodium extensions, global npm packages
```

Telemetry is off everywhere it can be set from config: the fish env file above,
`DISABLE_TELEMETRY` / `DISABLE_ERROR_REPORTING` in Claude Code, `telemetry.telemetryLevel` in VSCodium.
GUI apps (Steam, Screen Studio, ...) are set in their own preferences.

## Local coding agent

Three layers, one model for every Mac at home:

- **Qwen3.6-35B-A3B**, MLX 6-bit ([lmstudio-community/Qwen3.6-35B-A3B-MLX-6bit](https://huggingface.co/lmstudio-community/Qwen3.6-35B-A3B-MLX-6bit), 29 GB). A mixture of experts: 35B parameters, 3B used per token, so it's fast on a Mac.
- **[oMLX](https://github.com/jundot/omlx)** serves it from the Mac mini M4 Pro (64 GB) on `mac-mini-m4-pro.local:8000`.
- **[pi](https://github.com/earendil-works/pi)** runs on each Mac, edits that Mac's files and sends only the prompts to the Mac mini. The MacBook Pro M2 with 16 GB doesn't run a model at all.

In a 30-minute benchmark (pi building a whole Next.js site from one prompt, Mac mini M4 Pro):

| Server | Result | Time | Generation | Model memory |
|---|---|---|---|---|
| oMLX 0.7.3 | builds | 10.7 min | 66 tokens/s | 34 GB |
| LM Studio | builds | 14.9 min | 51 tokens/s | 37 GB |

Same model files, same pi. The 8-bit build (on LM Studio) was slower, 47 tokens/s, for no gain in the result. Qwen3.8-27B, a dense model, ran at 15 tokens/s; Ornith-1.5-35B needed twice the time.

### Server: Mac mini

1. Install [oMLX](https://github.com/jundot/omlx/releases) (not in Homebrew) and open it once, so it creates `~/.omlx`.
2. Download the model into `~/.omlx/models/Qwen3.6-35B-A3B-MLX-6bit`: with the Hugging Face downloader in oMLX's admin page (`http://127.0.0.1:8000/admin`, repo `lmstudio-community/Qwen3.6-35B-A3B-MLX-6bit`), or with Hugging Face's `hf download … --local-dir`.
3. Apply the settings and make this Mac's key:

   ```sh
   python3 dotfiles/omlx/setup.py
   mkdir -p ~/.pi/agent && cp -R dotfiles/pi/ ~/.pi/agent/
   ```

4. When macOS asks whether oMLX's Python may accept incoming connections, allow it.

`setup.py` stops the server, merges `omlx/settings.json` and `omlx/model_settings.json` into oMLX's own files and starts it again. Secrets stay in `~/.omlx`, never in this repo. It's safe to run again.

### Client: MacBook Pro (or any Mac on the Wi-Fi)

1. On the Mac mini, make a key for it: `python3 dotfiles/omlx/setup.py macbook-pro-m2`. It lands in `~/.config/omlx/macbook-pro-m2.key`.
2. On the MacBook, do steps 1–3 of [New machine](#new-machine), then:

   ```sh
   mkdir -p ~/.pi/agent && cp -R dotfiles/pi/ ~/.pi/agent/
   mkdir -p ~/.config/omlx && chmod 700 ~/.config/omlx
   pbpaste > ~/.config/omlx/api-key && chmod 600 ~/.config/omlx/api-key   # the key, copied from the Mac mini
   ```

That's all: `pi/models.json` is the same on both Macs. The Mac mini reaches itself by its `.local` name too.
If `mac-mini-m4-pro.local` doesn't resolve, use the Mac mini's IP in `baseUrl`. Away from home there is no model.

### Security

- oMLX refuses to listen on the network without an API key, and answers 401 to anyone without one.
- Each Mac has its own **sub-key**, in `~/.config/omlx/api-key` (mode 600). pi reads it on every request (`"apiKey": "!cat ~/.config/omlx/api-key"`), so no key is in this repo. Revoke a lost Mac's key in the admin page (or delete it from `auth.sub_keys` in `~/.omlx/settings.json`); the others keep working.
- The router doesn't forward port 8000, so the server is reachable only from the home network.
- Traffic is plain HTTP: on your own WPA2/WPA3 Wi-Fi that's fine. On a network you don't trust, keep oMLX on `127.0.0.1` and tunnel instead: `ssh -N -L 8000:127.0.0.1:8000 alex@mac-mini-m4-pro.local` (needs Remote Login on the Mac mini), with `baseUrl` `http://127.0.0.1:8000/v1`.

### Settings, and why

**oMLX** (`omlx/`):

- Context 131,072 tokens, as Qwen recommends ("at least 128K to preserve thinking"). Long sessions reach 70–90K; the whole Mac stays under 50 GB.
- Qwen's sampling for precise coding: temperature 0.6, top_p 0.95, top_k 20, min_p 0, presence_penalty 0. pi sends the same values with every request; these are the server's defaults for other clients.
- `preserve_thinking`: earlier turns keep their reasoning, as Qwen recommends for agents. It also keeps each request a prefix of the next, so the cache hits.
- 8 GB in-memory cache on top of the SSD cache. Measured on a 21K-token context: a cache hit takes 0.3 s (2.2 s from the SSD alone, 0.7 s in LM Studio). After a restart the SSD cache still answers in 2.2 s, where LM Studio reads the whole context again (28 s).
- Up to 8 requests at once (oMLX's default), so the Mac mini and the MacBook can work at the same time; they share the GPU, so each runs slower.

**pi** (`pi/`):

- `thinkingFormat: "qwen-chat-template"` sends Qwen's own `enable_thinking` and `preserve_thinking`. Thinking really turns off with `/thinking off` (or `--thinking off`), which LM Studio ignored. Off, pi switches to Qwen's non-thinking sampling (temperature 0.7, top_p 0.8, presence_penalty 1.5).
- `supportsDeveloperRole: false`: Qwen's chat template has no developer role.
- `contextWindow` 131,072 matches the server; pi compacts the session before it runs out. `maxTokens` 32,768.
- `packages` lists npm packages, which pi installs on its first start:
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

### Getting the most out of it

- **Thinking on** (the default, medium) for anything with several steps; **`/thinking off`** for quick edits and questions: answers start at once.
- **Give the whole task up front**, as one spec. The benchmark's best runs were single prompts with a clear "done" (`npm run build` passes).
- **Screenshots work**: the model reads images, so paste a broken layout instead of describing it.
- **Resume, don't restart**: `pi -c` continues the last session, and oMLX's SSD cache makes the old context cheap even the next day.
- **No subagents.** On one GPU with one model they take turns instead of working in parallel. In the benchmark, the run with subagents broke the page and took 29 minutes; the winning run used none.
- **One model on the Mac mini.** Don't load a second model (or run LM Studio) next to it: macOS gives the GPU about 75% of RAM.
- **Check the dashboard** at `http://127.0.0.1:8000/admin`: tokens per second, memory, cache use, keys.
- **Review what it builds.** In the benchmark every finished site still needed 4–7 small fixes, most often dead image URLs and a modal that Escape didn't close.
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

## Updates

- Apps: `brew upgrade`. Refresh the list with `brew bundle dump --file Brewfile --force`;
  `brew bundle cleanup --file Brewfile` shows what's installed but not listed.
- Claude Code plugins update on their own: the marketplace has `autoUpdate`, and
  `FORCE_AUTOUPDATE_PLUGINS=1` overrides `DISABLE_AUTOUPDATER=1`.
- Config files are copied by hand. pi packages: `pi update --extensions`.
- oMLX updates itself from its menu bar app; run `python3 dotfiles/omlx/setup.py` again afterwards to reapply the settings.
