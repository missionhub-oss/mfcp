// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {signoffs, verifySettlementSignoffs} from '../scripts/lib/progression.mjs';
import {completionPatch} from '../scripts/lib/task-completion.mjs';
import {withMentorSignoffs} from '../scripts/lib/mentors.mjs';
import {errorOutcome} from '../scripts/lib/command-feedback.mjs';

const evidence = JSON.parse(await readFile(new URL('./fixtures/settlement-evidence.json', import.meta.url), 'utf8'));
const qemu = JSON.parse(await readFile(new URL('./fixtures/qemu-settlement-evidence.json', import.meta.url), 'utf8'));
const governance = JSON.parse(await readFile(new URL('../programs/2026/governance.json', import.meta.url), 'utf8'));
const mentors = governance.mentors.map(record => withMentorSignoffs({id: record.github_id, login: record.github_login}, governance));

test('merged Sashiko patches retain eligible mentors in configuration order', () => {
  assert.equal(evidence.profile.contributions.length, 0);
  const selected = verifySettlementSignoffs(evidence.commits, evidence.profile, mentors);
  assert.deepEqual(selected, mentors);
  for (const commit of evidence.commits) {
    assert.deepEqual(verifySettlementSignoffs([commit], evidence.profile, selected), selected);
  }
  const otherMentors = mentors.filter(mentor => mentor.login !== 'zevorn');
  assert.deepEqual(verifySettlementSignoffs(evidence.commits, evidence.profile, otherMentors), otherMentors);
  assert.throws(() => verifySettlementSignoffs(evidence.commits, {github_id: selected[0].id}, mentors), /attributable author/);
  assert.throws(() => verifySettlementSignoffs([], evidence.profile, mentors), /no patch commits/);
});

test('merged QEMU author-only patches can settle with a configured independent mentor', () => {
  const configured = mentors.filter(mentor => mentor.login === 'zevorn');
  assert.deepEqual(signoffs(qemu.commits[0].commit.message), ['zifeng su <2859049527@qq.com>']);
  assert.deepEqual(verifySettlementSignoffs(qemu.commits, qemu.participant, configured), configured);
  const reversed = [...mentors].reverse();
  assert.deepEqual(verifySettlementSignoffs(qemu.commits, qemu.participant, reversed), reversed);
});

test('settlement requires an independent mentor and the actual patch author signature', () => {
  assert.throws(() => verifySettlementSignoffs(qemu.commits, qemu.participant, []), /configured independent mentor/);
  const contributor = {id: qemu.participant.github_id, login: qemu.participant.github_login};
  assert.throws(() => verifySettlementSignoffs(qemu.commits, qemu.participant, [contributor]), /configured independent mentor/);
  assert.deepEqual(verifySettlementSignoffs(qemu.commits, qemu.participant, [contributor, ...mentors]), mentors);
  assert.throws(() => verifySettlementSignoffs(qemu.commits, evidence.profile, mentors), /attributable author/);
  const mergeAuthor = {github_id: qemu.unsigned_commit.author.id};
  assert.deepEqual(signoffs(qemu.unsigned_commit.commit.message), []);
  assert.throws(() => verifySettlementSignoffs([qemu.unsigned_commit], mergeAuthor, mentors), /matching author DCO/);
});

test('an actual settlement request cannot close the task before its credit is published', () => {
  assert.equal(evidence.issue.state, 'open');
  assert.equal(completionPatch(evidence.issue, evidence.profile, evidence.command_source, []), null);
  const outcome = errorOutcome(new Error('Settlement is recorded; automatic closure is pending. GitHub did not confirm completion.'));
  assert.equal(outcome.status, 'waiting');
});
