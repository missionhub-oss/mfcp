// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {selectTaskMentor} from '../scripts/lib/progression.mjs';
import {taskMentors} from '../scripts/lib/profile.mjs';

const configurations = JSON.parse(await readFile(new URL('./fixtures/mentor-commands.json', import.meta.url), 'utf8'));
const fixture = JSON.parse(await readFile(new URL('./fixtures/mentor-configuration.json', import.meta.url), 'utf8'));
const first = configurations[0];
const original = {mentor_id: first.mentor.id, configuration: first.proof};
const at = fixture.issue.updated_at;

test('any authorized mentor can accept while the original task evidence remains intact', () => {
  for (const configuration of configurations) {
    assert.equal(selectTaskMentor(configurations, configuration.mentor.id, at, original), configuration);
  }
  assert.deepEqual(taskMentors(original), [{mentor_id: first.mentor.id, configuration: first.proof}]);
  const recorded = {...original, mentors: configurations.map(record => ({mentor_id: record.mentor.id, configuration: record.proof}))};
  assert.deepEqual(taskMentors(recorded), recorded.mentors);
  assert.throws(() => selectTaskMentor(configurations.slice(1), configurations[1].mentor.id, at, recorded), /authorization changed/);
});

test('unconfigured contributors and commands issued after a stage cannot authorize it', () => {
  assert.throws(() => selectTaskMentor(configurations, fixture.contributor.github_id, at, original), /previously configured/);
  for (const configuration of configurations) {
    const before = new Date(Date.parse(configuration.proof.at) - 1).toISOString();
    assert.throws(() => selectTaskMentor(configurations, configuration.mentor.id, before, original), /previously configured/);
  }
});
