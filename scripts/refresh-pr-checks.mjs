// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import { createClient, validatePullRequest, validatePullRequestJson } from './membership.mjs';
import { verifyIntegrity } from './lib/integrity.mjs';
import { execFileSync } from 'node:child_process';

async function verifyRepositoryData(client, number) {
  const input = JSON.parse(execFileSync(process.execPath, ['scripts/read-pr-input.mjs'], {
    encoding: 'utf8', env: {...process.env, PR_NUMBER: String(number)}, timeout: 300_000,
  }));
  execFileSync(process.execPath, ['scripts/check.mjs', input.directory], {timeout: 120_000});
  execFileSync(process.execPath, ['scripts/build-pages.mjs', input.directory], {timeout: 120_000});
  return 'Proposed JSON, annual rules, script syntax and directory build verified with trusted code.';
}

const client = createClient(process.env.GITHUB_TOKEN, process.env.GITHUB_REPOSITORY);
const checks = [
  ['JSON format and fields', validatePullRequestJson],
  ['validate', validatePullRequest],
  ['Progression integrity', verifyIntegrity],
  ['check', verifyRepositoryData],
];
const reports = [];
for (const pr of await client.list(`${client.root}/pulls?state=open`)) {
  if (pr.base.ref !== (await client.metadata()).default_branch) continue;
  for (const [name, verify] of checks) {
    const current = await client.request(`${client.root}/pulls/${pr.number}`);
    if (current.state !== 'open' || current.head.sha !== pr.head.sha) break;
    const check = await client.request(`${client.root}/check-runs`, 'POST', {
      name, head_sha: pr.head.sha, status: 'in_progress',
      started_at: new Date().toISOString(),
    });
    let conclusion = 'success';
    let summary;
    try {
      const result = await verify(client, pr.number);
      summary = typeof result === 'string' ? result : JSON.stringify(result);
      const latest = await client.request(`${client.root}/pulls/${pr.number}`);
      if (latest.head.sha !== pr.head.sha || latest.state !== 'open') {
        conclusion = 'cancelled';
        summary = 'PR changed during validation; a fresh PR event will validate its current revision.';
      }
    } catch (error) {
      conclusion = 'failure';
      summary = error.message;
    }
    await client.request(`${client.root}/check-runs/${check.id}`, 'PATCH', {
      status: 'completed', conclusion, completed_at: new Date().toISOString(),
      output: {title: name, summary},
    });
    reports.push({pr: pr.number, check: name, conclusion});
  }
}
console.log(JSON.stringify(reports, null, 2));
