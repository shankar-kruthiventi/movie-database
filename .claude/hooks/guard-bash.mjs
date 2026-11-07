#!/usr/bin/env node
// PreToolUse(Bash): stop commands that could break the project, lose work, or publish to the live site.
import { readInput, block } from './_lib.mjs';
const cmd = (readInput().tool_input || {}).command || '';

const RULES = [
  [/npm\s+audit\s+fix\b[^\n]*--force/, '`npm audit fix --force` jumps major versions blindly. Upgrade packages deliberately per the runbook.'],
  [/\bnpm\s+(install|i|add|update|up)\b[^\n]*(--force|-f)\b/, '`--force` installs hide peer-dependency conflicts. Resolve them properly.'],
  [/\bnpm\s+(update|up)\s*(&&|;|\||$)/, 'Blanket `npm update` is not allowed. Upgrade named packages one group at a time.'],
  [/\bgit\s+push\b/, 'Pushing is done by the owner manually after review. Do not push.'],
  [/\bgit\s+reset\s+--hard\b/, '`git reset --hard` destroys work. Use `git revert` or the rollback skill.'],
  [/\bgit\s+clean\s+-\w*[fdx]/, '`git clean -f` deletes untracked work.'],
  [/\bgit\s+branch\s+-D\b/, 'Force-deleting branches is not allowed.'],
  [/\bgit\s+(commit|merge|rebase|push)\b[^\n]*--no-verify/, '`--no-verify` is not allowed.'],
  [/\bgit\s+checkout\s+(--\s+)?\.\s*($|&&|;)/, 'Discarding all working-tree changes is not allowed.'],
  [/npm\s+run\s+deploy|\bgh-pages\b|npx\s+gh-pages|npm\s+publish/, 'Deploying/publishing updates the LIVE GitHub Pages site. The owner does this manually after Phase 6 sign-off.'],
  [/(curl|wget)[^\n|]*\|\s*(ba)?sh/, 'Piping downloads into a shell is not allowed.'],
];
for (const [re, why] of RULES) if (re.test(cmd)) block(why);

// bulk upgrades without a target/filter
if (/(npm-check-updates|\bncu\b)/.test(cmd) && /(\s-u\b|--upgrade)/.test(cmd) && !/(\s-t\s|--target|--filter|\s-f\s)/.test(cmd))
  block('`ncu -u` without --target or --filter upgrades everything at once. Scope it to the current phase.');

// rm -rf: only disposable build/output dirs
const tokens = cmd.split(/\s+/);
for (let i = 0; i < tokens.length; i++) {
  if (tokens[i] === 'rm' && /^-\w*[rR]/.test(tokens[i + 1] || '')) {
    for (let j = i + 1; j < tokens.length && !['&&', '||', ';', '|'].includes(tokens[j]); j++) {
      const t = tokens[j];
      if (t.startsWith('-')) continue;
      if (!/^(\.\/)?(node_modules|build|dist|coverage|test-results|playwright-report)(\/.*)?$/.test(t))
        block(`rm -r on "${t}" is not allowed. Only node_modules, build, dist, coverage, test-results, playwright-report may be deleted recursively.`);
    }
  }
}
process.exit(0);
