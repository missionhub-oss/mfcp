// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { normalizeProfile, rulesSchema, governanceSchema, activeSettlement } from './lib/profile.mjs';

if (process.argv[2]) process.chdir(process.argv[2]);

const read = async path => JSON.parse(await readFile(path, 'utf8'));
const identities = new Set();
const contributions = new Set();
for (const file of await readdir('participants')) {
  if (!file.endsWith('.json')) continue;
  const profile = normalizeProfile(await read(`participants/${file}`), `participants/${file}`);
  if (identities.has(profile.github_id)) throw new Error('Duplicate GitHub ID.');
  identities.add(profile.github_id);
  for (const task of profile.contributions) {
    const [year, version] = task.policy.id.split('.');
    const path = `programs/${year}/rules/${version}.json`;
    const rules = rulesSchema.parse(await read(path));
    const sha = execFileSync('git', ['hash-object', path], {encoding: 'utf8'}).trim();
    if (sha !== task.policy.sha || rules.points[task.difficulty] !== task.points) throw new Error('Task policy mismatch.');
    for (const pr of activeSettlement(profile, task)?.upstream ?? []) {
      const key = `${pr.repository}#${pr.number}`;
      if (contributions.has(key)) throw new Error('Upstream PR credited twice.');
      contributions.add(key);
    }
  }
}
for (const year of (await readdir('programs')).filter(name => /^\d{4}$/.test(name))) {
  let files;
  try {files = await readdir(`programs/${year}/rules`);} catch (error) {if (error.code === 'ENOENT') continue; throw error;}
  const dates = new Set();
  for (const file of files) {
    const rules = rulesSchema.parse(await read(`programs/${year}/rules/${file}`));
    if (rules.id !== `${year}.${file.slice(0, -5)}` || rules.year !== Number(year) || dates.has(Date.parse(rules.effective_at))) throw new Error('Invalid or ambiguous annual rules.');
    dates.add(Date.parse(rules.effective_at));
  }
  governanceSchema.parse(await read(`programs/${year}/governance.json`));
}
for (const dir of ['scripts', 'scripts/lib', 'site']) {
  for (const name of await readdir(dir)) if (name.endsWith('.mjs')) execFileSync(process.execPath, ['--check', `${dir}/${name}`]);
}
console.log(`Validated ${identities.size} contributor records, annual rules and script syntax.`);
