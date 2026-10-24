# dotfiles

My dev setup: Homebrew apps, Claude Code (plugin marketplace + config) and VSCodium.

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

## Layout

```
.claude-plugin/marketplace.json   marketplace "slimcandy" (must stay at the repo root)
claude/plugins/kit/               plugin "kit": hooks
claude/plugins/quiet-tools/       mod: each tool call drawn as "<icon> <description>", output under ctrl+o
claude/settings.json              -> ~/.claude/settings.json
claude/statusline.js              -> ~/.claude/statusline.js (needs a Nerd Font)
vscodium/settings.json            -> ~/Library/Application Support/VSCodium/User/settings.json
fish/config.fish                  -> ~/.config/fish/config.fish
fish/conf.d/no-telemetry.fish     -> ~/.config/fish/conf.d/: telemetry opt-outs (brew, gh, Next.js, ...)
starship/starship.toml            -> ~/.config/starship.toml (needs a Nerd Font)
Brewfile                          brew formulae, casks, VSCodium extensions, global npm packages
```

Telemetry is off everywhere it can be set from config: the fish env file above,
`DISABLE_TELEMETRY` / `DISABLE_ERROR_REPORTING` in Claude Code, `telemetry.telemetryLevel` in VSCodium.
GUI apps (Steam, Screen Studio, ...) are set in their own preferences.

## Updates

- Apps: `brew upgrade`. Refresh the list with `brew bundle dump --file Brewfile --force`;
  `brew bundle cleanup --file Brewfile` shows what's installed but not listed.
- Claude Code plugins update on their own: the marketplace has `autoUpdate`, and
  `FORCE_AUTOUPDATE_PLUGINS=1` overrides `DISABLE_AUTOUPDATER=1`.
- Config files are copied by hand.
