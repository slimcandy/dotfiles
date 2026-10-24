# claude-settings

My Claude Code setup, packaged as a plugin marketplace so moving to a new machine takes one command.

## Install on a new machine

```sh
curl -fsSL https://raw.githubusercontent.com/slimcandy/claude-settings/main/install.sh | sh
```

What it does:

1. Adds this repo as the `slimcandy` marketplace.
2. Installs the `kit@slimcandy` plugin (hooks, skills).
3. Merges `plugins/kit/settings.template.json` into `~/.claude/settings.json` (backup is written first).

Manual equivalent:

```sh
claude plugin marketplace add slimcandy/claude-settings
claude plugin install kit@slimcandy
# then inside Claude Code:
/kit:apply-settings
```

## Layout

```
.claude-plugin/marketplace.json     marketplace "slimcandy"
plugins/kit/
  .claude-plugin/plugin.json        plugin "kit"
  hooks/hooks.json                  sounds on Stop / Notification (macOS)
  skills/                           skills, namespaced as /kit:<name>
  scripts/apply-settings.js         deep-merge template -> ~/.claude/settings.json
  settings.template.json            user settings a plugin can't set itself
  statusline.js                     status line (needs a Nerd Font)
```

## Why two mechanisms

A plugin can ship skills, agents, hooks and MCP servers, but it can't set user settings like
`statusLine`, `permissions`, `env` or `modelSettings`. Those live in `settings.template.json`
and are applied by `apply-settings.js`. Re-run `/kit:apply-settings` after changing the template.

The status line points at the marketplace clone (`~/.claude/plugins/marketplaces/slimcandy/...`),
so it updates together with the marketplace.

## Updates

The template enables `autoUpdate` for this marketplace and sets `FORCE_AUTOUPDATE_PLUGINS=1`
(needed because `DISABLE_AUTOUPDATER=1` would otherwise turn plugin updates off too).
Push to `main`, and other machines pick it up on their next session.
`plugin.json` has no `version`, so every commit counts as a new version.

## Adding things

- Skill: `plugins/kit/skills/<name>/SKILL.md`
- Agent: `plugins/kit/agents/<name>.md`
- MCP server: `plugins/kit/.mcp.json`
- Another plugin: new folder under `plugins/` plus an entry in `marketplace.json`

Check with `claude plugin validate .` before pushing.
