// Shared helpers for migration hooks. Pure Node, no dependencies, works on Windows/macOS/Linux.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
export const STATE_DIR = path.join(ROOT, '.claude', 'state');
export const PHASES = [
  'Phase 0 - Baseline & safety net',
  'Phase 1 - Build tool: CRA -> Vite',
  'Phase 2 - React 16 -> 17',
  'Phase 3 - React Router 5 -> 6/7',
  'Phase 4 - Material-UI 4 -> MUI (current)',
  'Phase 5 - React 17 -> 18 -> 19 + scrollbar + test libs',
  'Phase 6 - Cleanup, security close-out, docs',
];

export function readInput() {
  try { return JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { return {}; }
}
export function block(msg) {
  process.stderr.write(`BLOCKED by migration guard: ${msg}\n`);
  process.exit(2);
}
export function git(args) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : '';
}
export const branch = () => git(['rev-parse', '--abbrev-ref', 'HEAD']);
export function rel(p) {
  if (!p) return '';
  return path.relative(ROOT, path.resolve(ROOT, p)).split(path.sep).join('/');
}
export function readJson(p, fallback = null) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}
// Literal TMDB-style secrets: 32 hex chars used as an api key. Never allowed to be (re)introduced.
export const SECRET_RES = [
  /api_key=[0-9a-f]{32}/i,
  /(TMDB|API)[_-]?(READ[_-]?)?KEY\s*[=:]\s*['"]?[0-9a-f]{32}/i,
];
