#!/usr/bin/env node
// Phase gate: one command that proves "nothing broke". Usage:
//   node scripts/migration/gate.mjs --baseline        (Phase 0 only: record how the OLD app behaves)
//   node scripts/migration/gate.mjs --phase 2         (after finishing a phase)
//   node scripts/migration/gate.mjs --phase 6 --strict (fail on any high/critical prod vulnerability)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const baselineMode = has('--baseline');
const strict = has('--strict');
const phase = has('--phase') ? Number(args[args.indexOf('--phase') + 1]) : null;

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const usesCRA = !!deps['react-scripts'];
const usesVitest = !!deps.vitest;
const nodeMajor = Number(process.versions.node.split('.')[0]);
const env = { ...process.env, CI: 'true' };
// react-scripts 3.x (webpack 4) fails on Node >= 17 without the legacy OpenSSL provider
if (usesCRA && nodeMajor >= 17) env.NODE_OPTIONS = `${env.NODE_OPTIONS || ''} --openssl-legacy-provider`.trim();

function run(name, cmd, required = true, extraEnv = {}) {
  const t = Date.now();
  const r = spawnSync(cmd, { shell: true, cwd: ROOT, env: { ...env, ...extraEnv }, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  return { name, cmd, required, ok: r.status === 0, code: r.status, seconds: Math.round((Date.now() - t) / 1000), tail: out.split('\n').slice(-20).join('\n'), out: r.stdout || '' };
}
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const results = [];

if (pkg.scripts?.test) {
  const cmd = usesVitest ? 'npx vitest run' : usesCRA ? 'npm test -- --watchAll=false' : 'npm test';
  // The pre-migration App.test.js is a stale CRA template test that already fails; recorded, not required, in baseline mode.
  results.push(run('unit tests', cmd, !baselineMode));
}
// CRA 3.x turns ESLint warnings into build errors when CI=true (pre-existing warnings in header.component.jsx); keep product code untouched.
if (pkg.scripts?.build) results.push(run('production build', 'npm run build', true, usesCRA ? { CI: 'false' } : {}));
if (['playwright.config.js', 'playwright.config.ts', 'playwright.config.mjs'].some(exists))
  results.push(run('e2e behavior contract', 'npx playwright test'));
else if (!baselineMode) results.push({ name: 'e2e behavior contract', cmd: '-', required: true, ok: false, code: null, seconds: 0, tail: 'No Playwright config found. Phase 0 must create the characterization tests.' });

const audit = run('npm audit', 'npm audit --json', false);
const auditProd = run('npm audit (prod only)', 'npm audit --omit=dev --json', false);
const counts = (r) => { try { return JSON.parse(r.out).metadata.vulnerabilities; } catch { return null; } };
const prod = counts(auditProd);
if (strict && prod && prod.high + prod.critical > 0) auditProd.ok = false, auditProd.required = true;
results.push(auditProd);

const outDir = ['build', 'dist'].find(exists);
let bundleKB = null;
if (outDir) {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [fs.statSync(path.join(d, e.name)).size]));
  bundleKB = Math.round(walk(path.join(ROOT, outDir)).reduce((a, b) => a + b, 0) / 1024);
}

const report = {
  at: new Date().toISOString(), phase, mode: baselineMode ? 'baseline' : 'gate', node: process.version,
  versions: { react: deps.react, 'react-dom': deps['react-dom'], 'react-router-dom': deps['react-router-dom'], mui: deps['@mui/material'] || deps['@material-ui/core'], toolchain: usesCRA ? 'react-scripts' : deps.vite ? 'vite' : 'unknown' },
  audit: { all: counts(audit), prod }, bundleKB, outDir,
  ok: results.filter((r) => r.required).every((r) => r.ok),
  steps: results.map(({ out, ...r }) => r),
};

const stateDir = path.join(ROOT, '.claude/state');
fs.mkdirSync(stateDir, { recursive: true });
fs.writeFileSync(path.join(stateDir, 'last-gate.json'), JSON.stringify(report, null, 2));
if (baselineMode) {
  const b = path.join(ROOT, 'docs/migration/baseline');
  fs.mkdirSync(b, { recursive: true });
  fs.writeFileSync(path.join(b, 'gate-baseline.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(b, 'audit-baseline.json'), audit.out || '{}');
  fs.writeFileSync(path.join(b, 'npm-ls-baseline.json'), run('ls', 'npm ls --depth=0 --json', false).out || '{}');
}
if (phase !== null && report.ok && !baselineMode) {
  const p = path.join(stateDir, 'phase.json');
  const s = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : { current: 0, completed: [] };
  if (!s.completed.includes(phase)) s.completed.push(phase);
  s.current = phase + 1;
  fs.writeFileSync(p, JSON.stringify(s));
}

console.log(`\nGATE ${report.ok ? 'PASS' : 'FAIL'}  (node ${process.version}, ${report.versions.toolchain}, react ${report.versions.react})`);
for (const r of results) console.log(`${r.ok ? ' ok ' : r.required ? 'FAIL' : 'warn'}  ${r.name.padEnd(26)} ${r.seconds}s`);
console.log(`audit all: ${JSON.stringify(report.audit.all)}\naudit prod: ${JSON.stringify(report.audit.prod)}\nbundle: ${bundleKB ?? '?'} KB in ${outDir ?? '?'}`);
for (const r of results.filter((x) => !x.ok && x.required)) console.log(`\n--- ${r.name} (${r.cmd}) ---\n${r.tail}`);
process.exit(report.ok ? 0 : 1);
