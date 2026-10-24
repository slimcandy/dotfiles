#!/bin/sh
# Bootstrap my Claude Code setup on a new machine.
#   curl -fsSL https://raw.githubusercontent.com/slimcandy/claude-settings/main/install.sh | sh
set -eu

command -v claude >/dev/null 2>&1 || { echo "claude CLI not found" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "node not found (needed for statusline and settings)" >&2; exit 1; }

claude plugin marketplace add slimcandy/claude-settings || claude plugin marketplace update slimcandy
claude plugin install kit@slimcandy --scope user

# Locate the marketplace clone via known_marketplaces.json instead of guessing the folder name.
config_dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
root=$(node -e '
  const m = require(process.argv[1]);
  process.stdout.write(m.slimcandy.installLocation);
' "$config_dir/plugins/known_marketplaces.json")

node "$root/plugins/kit/scripts/apply-settings.js"
echo "Done. Restart Claude Code."
