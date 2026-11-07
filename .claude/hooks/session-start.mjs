#!/usr/bin/env node
// SessionStart: stdout is added to Claude's context so every session knows where the migration stands.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, STATE_DIR, PHASES, branch, readJson } from './_lib.mjs';
const phase = readJson(path.join(STATE_DIR, 'phase.json'), { current: 0, completed: [] });
const gate = readJson(path.join(STATE_DIR, 'last-gate.json'));
const b = branch();
const lines = ['## Migration status (auto-generated)', `- Branch: ${b || '(not a git repo)'}`, `- Current: ${PHASES[phase.current] || phase.current}`, `- Completed phases: ${phase.completed.length ? phase.completed.join(', ') : 'none'}`];
if (gate) lines.push(`- Last gate: ${gate.ok ? 'PASS' : 'FAIL'} @ ${gate.at} (phase ${gate.phase ?? '?'})`);
else lines.push('- Last gate: never run');
if (['main', 'master'].includes(b)) lines.push('- WARNING: on main/master. Create a branch before touching product code: git checkout -b migration/modernize');
if (!fs.existsSync(path.join(ROOT, 'docs/migration/baseline/gate-baseline.json'))) lines.push('- WARNING: no baseline recorded yet. Phase 0 must finish before any upgrade.');
if (!fs.existsSync(path.join(ROOT, 'node_modules'))) lines.push('- node_modules missing: run npm ci (on the toolchain the phase expects).');
lines.push('- Read CLAUDE.md and docs/migration/BEHAVIOR-CONTRACT.md before changing code.');
console.log(lines.join('\n'));
