// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import { createClient, validatePullRequest, validatePullRequestJson } from './membership.mjs';
import { verifyIntegrity } from './lib/integrity.mjs';
import { execFileSync } from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {apiUsage} from './lib/github.mjs';
import {prCheckStateSchema, refreshPullRequestChecks} from './lib/pr-checks.mjs';
import {readProcessingState, saveProcessingState} from './lib/processing-state.mjs';

export async function verifyRepositoryData(client, number) {
  const input = JSON.parse(execFileSync(process.execPath, ['scripts/read-pr-input.mjs'], {
    encoding: 'utf8', env: {...process.env, PR_NUMBER: String(number)}, timeout: 300_000,
  }));
  execFileSync(process.execPath, ['scripts/check.mjs', input.directory], {timeout: 120_000});
  execFileSync(process.execPath, ['scripts/build-pages.mjs', input.directory], {timeout: 120_000});
  return {summary: 'Proposed JSON, annual rules, script syntax and directory build verified with trusted code.',
    api_requests: input.api.total};
}

export const checks = [
  ['JSON format and fields', validatePullRequestJson],
  ['validate', validatePullRequest],
  ['Progression integrity', verifyIntegrity],
  ['check', verifyRepositoryData],
];
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const {values} = parseArgs({options: {state: {type: 'string'}, 'dry-run': {type: 'boolean', default: false}}});
  const statePath = values.state || process.env.MFCP_PR_CHECK_STATE;
  const state = await readProcessingState(statePath, prCheckStateSchema);
  const client = createClient(process.env.GITHUB_TOKEN, process.env.GITHUB_REPOSITORY);
  const checkpoint = () => saveProcessingState(statePath, state, prCheckStateSchema);
  try {
    const reports = await refreshPullRequestChecks(client, checks, {state, write: !values['dry-run'], checkpoint});
    const api = apiUsage();
    api.child_requests = reports.reduce((sum, report) => sum + (report.api_requests ?? 0), 0);
    api.total += api.child_requests;
    console.log(JSON.stringify({checks: reports, api}, null, 2));
  } finally {await checkpoint();}
}
