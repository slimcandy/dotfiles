#!/bin/sh
# Install or re-apply my Claude Code setup. Safe to run repeatedly.
#   curl -fsSL https://raw.githubusercontent.com/slimcandy/claude-settings/main/install.sh | sh
set -eu

claude plugin marketplace add slimcandy/claude-settings || claude plugin marketplace update slimcandy
claude plugin install kit@slimcandy --scope user

# Deep-merge the repo's settings.json into ~/.claude/settings.json (repo values win, a backup is kept).
node -e '
const fs = require("fs"), dir = process.env.CLAUDE_CONFIG_DIR || process.env.HOME + "/.claude";
const repo = require(dir + "/plugins/known_marketplaces.json").slimcandy.installLocation;
const file = dir + "/settings.json";
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const merge = (a, b) => Object.fromEntries([...Object.entries(a), ...Object.entries(b).map(
  ([k, v]) => [k, isObj(v) && isObj(a[k]) ? merge(a[k], v) : v])]);
const current = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
if (fs.existsSync(file)) fs.copyFileSync(file, file + ".bak");
const next = merge(current, JSON.parse(fs.readFileSync(repo + "/settings.json", "utf8")));
fs.writeFileSync(file, JSON.stringify(next, null, 2) + "\n", { mode: 0o600 });
console.log("Settings applied, backup: " + file + ".bak");
'
echo "Done. Restart Claude Code."
