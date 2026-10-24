---
name: apply-settings
description: Apply my personal Claude Code settings template to ~/.claude/settings.json. Use when the user asks to sync, apply or restore their Claude Code settings on this machine.
disable-model-invocation: true
---

Apply the settings template bundled with this plugin to the user's `~/.claude/settings.json`.

1. Preview the merged result and show the user what will change compared to the current file:

   ```sh
   node "${CLAUDE_PLUGIN_ROOT}/scripts/apply-settings.js" --dry-run
   ```

2. If the user agrees, apply it (a timestamped backup is written next to the file):

   ```sh
   node "${CLAUDE_PLUGIN_ROOT}/scripts/apply-settings.js"
   ```

3. Tell the user to restart Claude Code so all settings take effect.
