#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const os = require('os');

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const SEP = ' • ';
const BAR_WIDTH = 12;

const paint = (color, text) => `${color}${text}${RESET}`;

let p = {};
try {
  p = JSON.parse(require('fs').readFileSync(0, 'utf8')) || {};
} catch {}
const ws = p.workspace || {};

// Path with home collapsed to "~"
const home = os.homedir();
let dir = ws.project_dir || p.cwd || '?';
if (dir === home || dir.startsWith(home + '/')) dir = '~' + dir.slice(home.length);

// Git branch, hidden outside a repo or on detached HEAD
let branch = '';
const gitDir = ws.current_dir || p.cwd;
if (gitDir) try {
  branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: gitDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
} catch {}
if (branch === 'HEAD') branch = '';

// Context usage bar, yellow from 75%, red from 90%
const percent = Math.max(0, Math.round(Number(p.context_window?.used_percentage) || 0));
const filled = Math.min(BAR_WIDTH, Math.round((percent / 100) * BAR_WIDTH));
const bar = `${'█'.repeat(filled)}${'░'.repeat(BAR_WIDTH - filled)} ${percent}%`;
const barColor = percent >= 90 ? RED : percent >= 75 ? YELLOW : '';

const cost = Number(p.cost?.total_cost_usd) || 0;

const line1 = [`${paint(BLUE, '\uf07b')} ${dir}`];
if (branch) line1.push(`${paint(CYAN, '\uf126')} ${branch}`);

const line2 = [
  `${paint(MAGENTA, '\uf2db')} ${p.model?.display_name || 'Claude'}`,
  `${paint(BLUE, '\uf1c0')} ${barColor ? paint(barColor, bar) : bar}`,
  '$' + cost.toFixed(cost >= 1 ? 2 : 3),
];

process.stdout.write(line1.join(SEP) + '\n' + line2.join(SEP) + '\n');
