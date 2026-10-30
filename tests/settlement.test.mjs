// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {verifySettlementSignoffs} from '../scripts/lib/progression.mjs';
import {completionPatch} from '../scripts/lib/task-completion.mjs';
import {withMentorSignoffs} from '../scripts/lib/mentors.mjs';
import {errorOutcome} from '../scripts/lib/command-feedback.mjs';

const evidence = JSON.parse(await readFile(new URL('./fixtures/settlement-evidence.json', import.meta.url), 'utf8'));
const governance = JSON.parse(await readFile(new URL('../programs/2026/governance.json', import.meta.url), 'utf8'));
const mentors = governance.mentors.map(record => withMentorSignoffs({id: record.github_id, login: record.github_login}, governance));

test('merged Sashiko patches select their shared independent mentor DCO without stage records', () => {
  assert.equal(evidence.profile.contributions.length, 0);
  const selected = verifySettlementSignoffs(evidence.commits, evidence.profile, mentors);
  assert.deepEqual(selected.map(mentor => mentor.login), ['zevorn']);
  for (const commit of evidence.commits) {
    assert.deepEqual(verifySettlementSignoffs([commit], evidence.profile, selected), selected);
  }
  assert.throws(() => verifySettlementSignoffs(evidence.commits, evidence.profile,
    mentors.filter(mentor => mentor.login !== 'zevorn')), /configured independent mentor/);
  assert.throws(() => verifySettlementSignoffs(evidence.commits, {github_id: selected[0].id}, mentors), /attributable author/);
  assert.throws(() => verifySettlementSignoffs([], evidence.profile, mentors), /no patch commits/);
});

test('an actual settlement request cannot close the task before its credit is published', () => {
  assert.equal(evidence.issue.state, 'open');
  assert.equal(completionPatch(evidence.issue, evidence.profile, evidence.command_source, []), null);
  const outcome = errorOutcome(new Error('Settlement is recorded; automatic closure is pending. GitHub did not confirm completion.'));
  assert.equal(outcome.status, 'waiting');
});
