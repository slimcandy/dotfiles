#!/usr/bin/env node
'use strict';

// Deep-merge settings.template.json into ~/.claude/settings.json.
// Template values win; keys that exist only locally are kept.
// Arrays are replaced, not concatenated. A backup is written first.
//
// Usage: node apply-settings.js [--dry-run]

const fs = require('fs');
const os = require('os');
const path = require('path');

const dryRun = process.argv.includes('--dry-run');
const templatePath = path.join(__dirname, '..', 'settings.template.json');
const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const settingsPath = path.join(configDir, 'settings.json');

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function merge(base, patch) {
  const out = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    out[key] = isObject(value) && isObject(base[key]) ? merge(base[key], value) : value;
  }
  return out;
}

const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
const current = fs.existsSync(settingsPath)
  ? JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
  : {};
const next = merge(current, template);
const text = JSON.stringify(next, null, 2) + '\n';

if (dryRun) {
  process.stdout.write(text);
  process.exit(0);
}

fs.mkdirSync(configDir, { recursive: true });
if (fs.existsSync(settingsPath)) {
  const backup = `${settingsPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  fs.copyFileSync(settingsPath, backup);
  console.log(`Backup: ${backup}`);
}
fs.writeFileSync(settingsPath, text, { mode: 0o600 });
console.log(`Applied ${templatePath} -> ${settingsPath}`);
