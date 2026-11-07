#!/usr/bin/env node
// Stop: refuse to finish a turn while the repo is in a state that would silently break the migration.
import fs from 'node:fs';
import path from 'node:path';
import { readInput, git, ROOT, SECRET_RES } from './_lib.mjs';
const inp = readInput();
if (inp.stop_hook_active) process.exit(0); // never loop

const problems = [];
const changed = git(['diff', '--name-only', 'HEAD']).split('\n').filter(Boolean);
if (changed.includes('package.json') && !changed.includes('package-lock.json'))
  problems.push('package.json changed but package-lock.json did not. Run `npm install` to sync the lockfile.');

const added = git(['diff', 'HEAD', '-U0']).split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
if (added.some((l) => SECRET_RES.some((re) => re.test(l)))) problems.push('A literal API key appears in added lines. Move it to an env var.');
for (const f of git(['ls-files', '--others', '--exclude-standard']).split('\n').filter((f) => /\.(jsx?|mjs|json|html|md|env.*)$/.test(f))) {
  try {
    const p = path.join(ROOT, f);
    if (fs.statSync(p).size < 300000 && SECRET_RES.some((re) => re.test(fs.readFileSync(p, 'utf8')))) problems.push(`Untracked file ${f} contains a literal API key.`);
  } catch {}
}
if (problems.length) { process.stderr.write('Cannot stop yet:\n- ' + problems.join('\n- ') + '\n'); process.exit(2); }
process.exit(0);
