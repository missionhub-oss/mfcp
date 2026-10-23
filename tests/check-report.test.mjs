// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {spawnSync} from 'node:child_process';

async function runReport(args, env = {}) {
  await mkdir('.mfcp-runtime', {recursive: true});
  const directory = await mkdtemp('.mfcp-runtime/check-report-');
  const summary = resolve(join(directory, 'summary.md'));
  await writeFile(summary, '');
  try {
    const child = spawnSync(process.execPath, args, {encoding: 'utf8', timeout: 30_000,
      env: {...process.env, GITHUB_STEP_SUMMARY: summary, ...env}});
    return {...child, summary: await readFile(summary, 'utf8')};
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
}

test('a rejected real commit produces actionable annotations and a job summary while failing the process', async () => {
  const result = await runReport(['tests/fixtures/report-commit.mjs']);
  assert.equal(result.status, 1);
  assert.equal(result.stdout.split('::error ').length - 1, 2);
  assert.ok(result.stdout.includes('line 3, column 66'));
  assert.ok(result.stdout.includes('CR, U+000D'));
  assert.ok(result.stdout.includes("missing the commit author's Signed-off-by"));
  assert.ok(!result.stderr.includes('at validateCommitMessage'));
  assert.ok(result.summary.includes('/commit/d5b2d56c8f6e6287f1af369a4060106f62753c38'));
  assert.ok(result.summary.includes('git commit --amend -s'));
  assert.ok(result.summary.includes('git push --force-with-lease'));
  assert.ok(result.summary.includes('\\r'));
  assert.ok(!result.summary.includes('the limit is 72'));
});

test('the trusted CLI wrapper reports input failures without an uncaught exception', async () => {
  const result = await runReport(['scripts/run-check.mjs', 'read-pr-input.mjs'], {PR_NUMBER: '0'});
  assert.equal(result.status, 1);
  assert.ok(result.stdout.includes('::error '));
  assert.ok(result.summary.includes('A valid PR number is required.'));
  assert.ok(!result.stderr.includes('at file:'));
});
