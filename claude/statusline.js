#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const os = require('os');

const RESET = '\x1b[0m';
// Claude Code's own grey for "✻ Cogitated for 26s": rgb(153,153,153) in the dark theme,
// which a 256-colour terminal like Terminal.app receives as index 246
const MUTED = '\x1b[38;5;246m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const BAR_WIDTH = 12;
const PATH_WIDTH = 40;
const SHOW_FROM = 75; // context and limits stay hidden below this percentage

const paint = (color, text) => `${color}${text}${RESET}`;
const dim = text => paint(MUTED, text);
const SEP = dim(' • ');
const severity = pct => (pct >= 90 ? RED : YELLOW);

let p = {};
try {
  p = JSON.parse(require('fs').readFileSync(0, 'utf8')) || {};
} catch {}
const ws = p.workspace || {};

// Terminal columns: pictographic emoji take two cells, joiners and variation selectors none
const cols = str => {
  let w = 0;
  for (const ch of str) w += /\p{Extended_Pictographic}/u.test(ch) ? 2 : /[\uFE0F\u200D]/.test(ch) ? 0 : 1;
  return w;
};
const cut = (str, n) => {
  if (cols(str) <= n) return str;
  let out = '';
  for (const ch of str) {
    if (cols(out + ch) > n - 1) break;
    out += ch;
  }
  return out.replace(/[\s,]+$/, '') + '…';
};

// Shorten from the middle, keeping as many trailing folders as fit: ~/Documents/…/technical-writing
const shortenPath = (path, width) => {
  if (cols(path) <= width) return path;
  const segs = path.split('/');
  const head = segs[0];
  const last = segs[segs.length - 1];
  let tail = [last];
  for (let i = segs.length - 2; i >= 1; i--) {
    const next = [segs[i], ...tail];
    if (cols(`${head}/…/${next.join('/')}`) > width) break;
    tail = next;
  }
  let out = `${head}/…/${tail.join('/')}`;
  const withFirst = `${head}/${segs[1]}/…/${tail.join('/')}`;
  if (segs.length - 1 - tail.length >= 2 && cols(withFirst) <= width) out = withFirst;
  if (cols(out) > width) out = `${head}/…/${cut(last, width - cols(head + '/…/'))}`;
  return out;
};

// Path with home collapsed to "~"
const home = os.homedir();
let dir = ws.project_dir || p.cwd || '?';
if (dir === home || dir.startsWith(home + '/')) dir = '~' + dir.slice(home.length);
dir = shortenPath(dir, PATH_WIDTH);

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

const pct = v => Math.max(0, Math.round(Number(v) || 0));
// Reset time: "14:30" today, "пн 07:00" on another day
const clock = epoch => {
  const at = new Date(epoch * 1000);
  const time = at.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (at.toDateString() === new Date().toDateString()) return time;
  return at.toLocaleDateString('ru-RU', { weekday: 'short' }) + ' ' + time;
};

// Line 1: file system
const line1 = [`${paint(BLUE, '\uf07b')} ${dim(dir)}`];
if (branch) line1.push(`${paint(CYAN, '\uf126')} ${dim(branch)}`);

// Line 2: Claude, effort level attached to the model name: "Opus 5.5 (medium)"
let model = p.model?.display_name || 'Claude';
if (p.effort?.level) model += ` (${p.effort.level})`;
const line2 = [`${paint(MAGENTA, '\uf2db')} ${dim(model)}`];
if (p.fast_mode) line2.push(paint(YELLOW, '\uf0e7 fast'));

// Context bar from SHOW_FROM: yellow, red from 90%
const ctx = pct(p.context_window?.used_percentage);
if (ctx >= SHOW_FROM) {
  const filled = Math.min(BAR_WIDTH, Math.round((ctx / 100) * BAR_WIDTH));
  line2.push(paint(severity(ctx), `\uf1c0 ${'█'.repeat(filled)}${'░'.repeat(BAR_WIDTH - filled)} ${ctx}%`));
}

// Subscription limits from SHOW_FROM, with local reset time
const LIMITS = [['five_hour', '\uf252'], ['seven_day', '\uf073']];
for (const [key, icon] of LIMITS) {
  const limit = p.rate_limits?.[key];
  const used = pct(limit?.used_percentage);
  if (!limit || used < SHOW_FROM) continue;
  let text = paint(severity(used), `${icon} ${used}%`);
  if (limit.resets_at) text += ' ' + dim(`\uf021 ${clock(limit.resets_at)}`);
  line2.push(text);
}

const cost = Number(p.cost?.total_cost_usd) || 0;
line2.push(dim('$' + cost.toFixed(cost >= 1 ? 2 : 3)));

process.stdout.write(line1.join(SEP) + '\n' + line2.join(SEP) + '\n');
