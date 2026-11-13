// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { initialProfile, totals, validateProfile } from '../scripts/lib/profile.mjs';
import { recognitionOnlyChange } from '../scripts/membership.mjs';

const at = '2026-11-13T08:00:00Z';
const policy = { id: '2026.v7', sha: 'b'.repeat(40) };
const proof = {
  source: { kind: 'comment', issue: 1, comment: 2 },
  actor: 1,
  at,
  digest: 'a'.repeat(64),
  details: '{"level":4}',
};

function recognised(level = 4, points = 600) {
  const profile = initialProfile({ github_id: 1, github_login: 'tester' });
  for (let step = 1; step <= level; step++) {
    profile.promotions.push({ id: `promotion-${step}`, from: step - 1, to: step, policy, proof,
      reason: `Recognition for level ${step}.`, evidence: [], review_pr: null });
  }
  profile.recognitions.push({ id: 'recognition-l4', points, proof, reason: 'Recognised for public impact.' });
  profile.level = level;
  profile.experience = totals(profile).experience;
  profile.updated_at = at;
  return profile;
}

test('recognition points count towards experience and the level record', () => {
  const profile = validateProfile(recognised(), 'participants/tester.json');
  assert.equal(profile.level, 4);
  assert.equal(profile.experience, 600);
  assert.equal(totals(profile).experience, 600);
});

test('recognitions default to an empty list in older records', () => {
  const record = initialProfile({ github_id: 1, github_login: 'tester' });
  delete record.recognitions;
  const profile = validateProfile(record, 'participants/tester.json');
  assert.deepEqual(profile.recognitions, []);
  assert.equal(totals(profile).experience, 0);
});

test('experience must match settled and recognised points', () => {
  const profile = recognised();
  profile.experience = 300;
  assert.throws(() => validateProfile(profile, 'participants/tester.json'), /Profile totals or level disagree/);
});

test('only appended recognitions and promotions are a recognition change', () => {
  const before = initialProfile({ github_id: 1, github_login: 'tester' });
  const after = recognised();
  assert.equal(recognitionOnlyChange(before, after), true);
  assert.equal(recognitionOnlyChange(after, before), false);

  const changed = structuredClone(after);
  changed.contributions.push({ id: 'task-1' });
  assert.equal(recognitionOnlyChange(before, changed), false);

  const registration = structuredClone(after);
  registration.promotions[0].proof.source = { kind: 'registration', pr: 1 };
  assert.equal(recognitionOnlyChange(before, registration), false);
});

test('recognition evidence may move to another public comment', () => {
  const before = recognised();
  const after = structuredClone(before);
  const moved = { source: { kind: 'comment', issue: 9, comment: 10 }, actor: 1,
    at: '2026-11-14T00:00:00Z', digest: 'c'.repeat(64), details: '{"level":4}' };
  after.recognitions[0].proof = moved;
  assert.equal(recognitionOnlyChange(before, after), true);

  after.recognitions[0].points = 500;
  assert.equal(recognitionOnlyChange(before, after), false);
});
