// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {waitChecks} from '../scripts/progression.mjs';

const NAMES = ['JSON format and fields', 'validate', 'Progression integrity'];

function check(name, conclusion) {
  return {id: NAMES.indexOf(name) + 1, name, app: {id: 15368}, status: 'completed', conclusion};
}

function client(checks, heads) {
  let call = 0;
  return {
    root: 'repos/missionhub-oss/mfcp',
    head: async () => heads[Math.min(call++, heads.length - 1)],
    request: async path => {
      assert.match(path, /\/check-runs\?per_page=100$/);
      return {total_count: checks.length, check_runs: checks};
    },
  };
}

test('candidate checks pass on the current base', async () => {
  const outcome = await waitChecks(client(NAMES.map(name => check(name, 'success')), ['base']), 'candidate', 'base');
  assert.equal(outcome, 'passed');
});

test('a failed candidate check on an unchanged base remains an error', async () => {
  await assert.rejects(waitChecks(client(NAMES.map(name => check(name, 'failure')), ['base']), 'candidate', 'base'),
    /Required candidate check failed/);
});

test('a failed candidate check after main moves is retryable', async () => {
  const outcome = await waitChecks(client(NAMES.map(name => check(name, 'failure')), ['next']), 'candidate', 'base');
  assert.equal(outcome, 'stale');
});

test('a pending candidate check after main moves is retryable without polling', async () => {
  const checks = NAMES.map(name => ({...check(name, null), status: 'in_progress'}));
  const outcome = await waitChecks(client(checks, ['next']), 'candidate', 'base');
  assert.equal(outcome, 'stale');
});
