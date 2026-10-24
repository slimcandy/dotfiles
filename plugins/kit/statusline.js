#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const os = require('os');

// ---------------------------------------------------------------------------
// ANSI colors. No background codes — the statusline inherits the terminal's
// own background. Every colored fragment is closed with RESET.
// ---------------------------------------------------------------------------
const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m'; // declared but intentionally unused
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';

// Nerd Font glyphs
const ICON_FOLDER = '';
const ICON_BRANCH = '';
const ICON_MODEL = '';
const ICON_CONTEXT = '';
const ICON_COST = ''; // declared but intentionally unused

const SEPARATOR = ' • '; // " • " in the terminal's default color

const BAR_WIDTH = 12;
const BAR_FILLED = '█'; // █
const BAR_EMPTY = '░'; // ░

const paint = (color, text) => `${color}${text}${RESET}`;

// ---------------------------------------------------------------------------
// stdin payload — never throw, fall back to an empty object
// ---------------------------------------------------------------------------
function readPayload() {
  let raw = '';
  try {
    raw = require('fs').readFileSync(0, 'utf8');
  } catch {
    return {};
  }
  if (!raw || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Path: workspace.project_dir, else cwd. Backslashes normalized to "/", the
// home directory collapsed to "~" (case-insensitively on Windows).
// ---------------------------------------------------------------------------
function formatPath(payload) {
  const workspace = payload.workspace || {};
  const raw = workspace.project_dir || payload.cwd;
  if (!raw || typeof raw !== 'string') return '?';

  const normalized = raw.replace(/\\/g, '/');
  const home = (os.homedir() || '').replace(/\\/g, '/').replace(/\/+$/, '');
  if (!home) return normalized;

  const isWindows = process.platform === 'win32';
  const haystack = isWindows ? normalized.toLowerCase() : normalized;
  const needle = isWindows ? home.toLowerCase() : home;

  if (haystack === needle) return '~';
  if (haystack.startsWith(needle + '/')) {
    return '~' + normalized.slice(home.length);
  }
  return normalized;
}

// ---------------------------------------------------------------------------
// Git branch. Hidden when the directory is not a repo, the command fails, the
// result is empty, or HEAD is detached. Git errors are never surfaced.
// ---------------------------------------------------------------------------
function gitBranch(payload) {
  const workspace = payload.workspace || {};
  const dir = workspace.current_dir || payload.cwd;
  if (!dir || typeof dir !== 'string') return '';

  try {
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (!branch || branch === 'HEAD') return '';
    return branch;
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Context window percentage
// ---------------------------------------------------------------------------
function contextPercent(payload) {
  const cw = payload.context_window || {};

  if (cw.used_percentage !== null && cw.used_percentage !== undefined) {
    const direct = Number(cw.used_percentage);
    if (Number.isFinite(direct)) return clampPercent(Math.round(direct));
  }

  const used = Number(
    cw.total_input_tokens !== undefined
      ? cw.total_input_tokens
      : payload.total_input_tokens
  );
  if (!Number.isFinite(used)) return 0;

  const exceeds =
    cw.exceeds_200k_tokens !== undefined
      ? cw.exceeds_200k_tokens
      : payload.exceeds_200k_tokens;
  const fallbackLimit = exceeds === true ? 1_000_000 : 200_000;

  const size = Number(cw.context_window_size);
  const limit = Number.isFinite(size) && size > 0 ? size : fallbackLimit;

  return clampPercent(Math.round((used / limit) * 100));
}

function clampPercent(percent) {
  if (!Number.isFinite(percent)) return 0;
  return Math.max(0, percent);
}

function contextBar(percent) {
  let filled = Math.round((percent / 100) * BAR_WIDTH);
  if (!Number.isFinite(filled)) filled = 0;
  filled = Math.min(BAR_WIDTH, Math.max(0, filled));
  return BAR_FILLED.repeat(filled) + BAR_EMPTY.repeat(BAR_WIDTH - filled);
}

function contextColor(percent) {
  if (percent >= 90) return RED;
  if (percent >= 75) return YELLOW;
  return '';
}

// ---------------------------------------------------------------------------
// Cost: two decimals from $1 up, three decimals below. Default terminal color,
// no dedicated icon.
// ---------------------------------------------------------------------------
function formatCost(payload) {
  const cost = payload.cost || {};
  const value = Number(cost.total_cost_usd);
  const amount = Number.isFinite(value) ? value : 0;
  return '$' + amount.toFixed(amount >= 1 ? 2 : 3);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function main() {
  const payload = readPayload();

  const firstSegments = [`${paint(BLUE, ICON_FOLDER)} ${formatPath(payload)}`];
  const branch = gitBranch(payload);
  if (branch) {
    firstSegments.push(`${paint(CYAN, ICON_BRANCH)} ${branch}`);
  }

  const model = (payload.model && payload.model.display_name) || 'Claude';
  const percent = contextPercent(payload);
  const color = contextColor(percent);
  const barText = `${contextBar(percent)} ${percent}%`;
  const contextSegment = `${paint(BLUE, ICON_CONTEXT)} ${
    color ? paint(color, barText) : barText
  }`;

  const secondSegments = [
    `${paint(MAGENTA, ICON_MODEL)} ${model}`,
    contextSegment,
    formatCost(payload),
  ];

  process.stdout.write(
    firstSegments.join(SEPARATOR) + '\n' + secondSegments.join(SEPARATOR) + '\n'
  );
}

main();
