# claude-settings

My Claude Code setup as a plugin marketplace.

## Install / re-apply settings

```sh
curl -fsSL https://raw.githubusercontent.com/slimcandy/claude-settings/main/install.sh | sh
```

Adds this repo as the `slimcandy` marketplace, installs `kit@slimcandy`, and deep-merges
`settings.json` into `~/.claude/settings.json` (backup: `settings.json.bak`). Run it again after
changing `settings.json`.

## Layout

```
.claude-plugin/marketplace.json   marketplace "slimcandy"
plugins/kit/                      plugin "kit": hooks, skills, agents, .mcp.json
settings.json                     user settings a plugin can't set (statusLine, env, permissions…)
statusline.js                     status line, run from the marketplace clone (needs a Nerd Font)
install.sh
```

Plugin changes reach other machines automatically (`autoUpdate` + `FORCE_AUTOUPDATE_PLUGINS`).
`settings.json` changes need `install.sh` to be re-run.
