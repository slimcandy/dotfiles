# claude-settings

My Claude Code setup: a plugin marketplace plus config files a plugin can't ship.

## New machine

1. Copy the config files:

   ```sh
   git clone https://github.com/slimcandy/claude-settings.git
   cp claude-settings/config/* ~/.claude/
   ```

2. Install the plugins:

   ```sh
   claude plugin marketplace add slimcandy/claude-settings
   claude plugin install kit@slimcandy
   ```

   Since `config/settings.json` declares the marketplace and enables `kit@slimcandy`,
   Claude Code may also offer to install it on first start.

## Layout

```
.claude-plugin/marketplace.json   marketplace "slimcandy"
plugins/kit/                      plugin "kit": hooks (later: skills, agents, .mcp.json)
config/settings.json              -> ~/.claude/settings.json
config/statusline.js              -> ~/.claude/statusline.js (needs a Nerd Font)
```

## Updates

- Plugins update on their own: the marketplace has `autoUpdate`, and `FORCE_AUTOUPDATE_PLUGINS=1`
  overrides `DISABLE_AUTOUPDATER=1`, which would otherwise block plugin updates too.
- Files in `config/` are copied by hand.
