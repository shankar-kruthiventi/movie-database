#!/usr/bin/env node
// PostToolUse(Edit|Write|MultiEdit): audit trail + reminders.
import fs from 'node:fs';
import path from 'node:path';
import { readInput, rel, STATE_DIR } from './_lib.mjs';
const inp = readInput();
const ti = inp.tool_input || {};
const r = rel(ti.file_path || ti.path || '');
if (!r) process.exit(0);
try {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.appendFileSync(path.join(STATE_DIR, 'edit-log.tsv'), `${new Date().toISOString()}\t${inp.tool_name}\t${r}\n`);
} catch {}
if (r === 'package.json') {
  process.stderr.write('package.json changed: run `npm install` now so package-lock.json stays in sync, then run the phase gate (node scripts/migration/gate.mjs).\n');
  process.exit(2); // PostToolUse: feeds this message back to Claude; the edit itself already happened
}
if (/^src\/.*\.(js|jsx)$/.test(r) && /\bpropTypes\b|\bfindDOMNode\b|ReactDOM\.render\(/.test(ti.new_string || ti.content || ''))
  process.stderr.write('Note: this edit contains an API removed in newer React. Make sure it matches the current phase.\n'), process.exit(2);
process.exit(0);
