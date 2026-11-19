// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {selectTaskMentor, settlementCommandCandidates} from '../scripts/lib/progression.mjs';
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

test('settlement candidates accept immutable commands from any active mentor', () => {
  const at = '2026-11-18T12:50:32Z';
  const command = '@mfcp-progress settle https://github.com/zephyrproject-rtos/zephyr/pull/126213';
  const comments = [
    {id: 1, user: {type: 'User', id: 81150281, login: 'hongquan-prog'}, created_at: at, updated_at: at, body: command},
    {id: 2, user: {type: 'User', id: 81150281, login: 'hongquan-prog'}, created_at: at, updated_at: '2026-11-18T12:51:32Z', body: command},
    {id: 3, user: {type: 'Bot', id: 41898282, login: 'github-actions[bot]'}, created_at: at, updated_at: at, body: command},
    {id: 4, user: {type: 'User', id: 81150281, login: 'hongquan-prog'}, created_at: at, updated_at: at, body: '@mfcp-progress configure mentor @hongquan-prog'},
    {id: 5, user: {type: 'User', id: 81150281, login: 'hongquan-prog'}, created_at: at, updated_at: at, body: '> @mfcp-progress settle https://github.com/zephyrproject-rtos/zephyr/pull/126213'},
  ];
  assert.deepEqual(settlementCommandCandidates(comments, 'mfcp-progress').map(comment => comment.id), [1]);
});
