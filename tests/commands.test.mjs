// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { parseCommand, taskSettings as readTaskSettings } from '../scripts/lib/commands.mjs';
import { validateAssignment, assignmentSuperseded } from '../scripts/lib/assignments.mjs';

const slug = 'mfcp-progress';
const parse = text => parseCommand(`@${slug} ${text}`, slug);
const repo = 'https://github.com/processmission-intern/mission-forge';
const registration = `${repo}/pull/14`;
const notification = `${registration}#issuecomment-6316896791`;
const description = 'Documented command syntax; evidence must be verified before any approval.';
const participant = JSON.parse(await readFile(new URL('../participants/hongquan-prog.json', import.meta.url), 'utf8'));
const taskSettings = issue => readTaskSettings(issue, {at: participant.promotions[0].proof.at});
const catalog = JSON.parse(await readFile(new URL('../.github/labels.json', import.meta.url), 'utf8'));
const labels = ['kind/task', 'difficulty/level1', '2026'].map(name => {
  const label = catalog.find(item => item.name === name);
  assert.ok(label, `${name} must be in the repository label catalog`);
  return label;
});

test('task commands use only mentor or evidence arguments', () => {
  assert.deepEqual(parse('configure assignee @hongquan-prog'), {action: 'assign', data: {assignee: 'hongquan-prog'}});
  assert.deepEqual(parse('configure mentor @zevorn'), {action: 'configure', data: {mentor: '@zevorn'}});
  assert.equal(parse('configure mentor 62325246').data.mentor, '62325246');
  assert.deepEqual(parse(`accept reproduction ${notification}`).data, {stage: 'reproduced', evidence: [notification]});
  assert.equal(parse(`accept validation ${notification}`).data.stage, 'validated');
  assert.deepEqual(parse(`settle ${registration}`).data, {pull_requests: [registration]});
  assert.throws(() => parse('configure mentor @zevorn difficulty 1 year 2026'));
  assert.throws(() => parse('configure assignee @hongquan-prog @zevorn'));
  assert.throws(() => parse('accept validation'));
  assert.throws(() => parse('settle'));
});

test('assignment requires registration and discussion participation without replacing an owner', () => {
  const account = {id: participant.github_id, login: participant.github_login, type: 'User'};
  const profiles = [{profile: participant}];
  const issue = {labels, assignees: [], user: account};
  assert.doesNotThrow(() => validateAssignment(issue, account, profiles, []));
  assert.throws(() => validateAssignment(issue, account, [], []));
  const mentor = {id: 62325246, login: 'zevorn', type: 'User'};
  assert.throws(() => validateAssignment({...issue, user: mentor}, account, profiles, []));
  assert.doesNotThrow(() => validateAssignment({...issue, user: mentor}, account, profiles, [{user: account}]));
  assert.throws(() => validateAssignment({...issue, assignees: [mentor]}, account, profiles, []));
  assert.throws(() => validateAssignment({...issue, pull_request: {}}, account, profiles, []));
});

test('native assignment history prevents replay after a later unassignment', () => {
  const at = participant.promotions[0].proof.at;
  assert.equal(assignmentSuperseded([{event: 'assigned', created_at: at}], at), true);
  assert.equal(assignmentSuperseded([{event: 'unassigned', created_at: at}], at), true);
  assert.equal(assignmentSuperseded([{event: 'labeled', created_at: at}], at), false);
  assert.equal(assignmentSuperseded([{event: 'assigned', created_at: at}], new Date(Date.parse(at) + 1000).toISOString()), false);
});

test('senior promotion commands preserve candidate and evidence scope', () => {
  assert.equal(parse(`endorse @hongquan-prog L3\n\n${description}`).data.participant, 'hongquan-prog');
  assert.equal(parse(`interview @hongquan-prog L3 ${notification}\n\n${description}`).data.reference, notification);
  assert.deepEqual(parse(`recommend @hongquan-prog L4 ${notification}\n\n${description}`).data.evidence, [notification]);
  const l3 = parse(`promote @hongquan-prog L3 mentor ${notification} interview ${notification}\n\n${description}`);
  assert.equal(l3.data.level, 3);
  assert.equal(l3.data.interview_comment, notification);
  const l4 = parse(`promote @hongquan-prog L4 mentor ${notification} recommend ${notification} ${registration}\n\n${description}`);
  assert.deepEqual(l4.data.recommendations, [notification, registration]);
  assert.throws(() => parse('endorse @hongquan-prog L3'));
  assert.throws(() => parse(`interview @hongquan-prog L4 ${notification}\n\n${description}`));
  assert.throws(() => parse(`promote @hongquan-prog L3 mentor ${notification}\n\n${description}`));
});

test('quoted examples and unrelated mentions never execute commands', () => {
  assert.equal(parseCommand('```text\n@mfcp-progress configure mentor @zevorn\n```', slug), null);
  assert.equal(parseCommand('> @mfcp-progress configure mentor @zevorn', slug), null);
  assert.equal(parseCommand('@another-bot configure mentor @zevorn', slug), null);
  assert.throws(() => parse('configure\n\n```json\n{"mentor":"zevorn"}\n```'));
  assert.throws(() => parse('configure mentor @zevorn; echo x'));
  assert.throws(() => parse('configure mentor $HOME'));
  assert.throws(() => parse('configure mentor @zevorn | echo x'));
});

test('native task fields are mandatory and unambiguous', () => {
  const issue = {labels, assignees: [{id: participant.github_id, login: participant.github_login, type: 'User'}]};
  assert.deepEqual(taskSettings(issue), {participant_id: participant.github_id, difficulty: 1, year: 2026});
  assert.throws(() => taskSettings({...issue, assignees: []}));
  assert.throws(() => taskSettings({...issue, assignees: [...issue.assignees, ...issue.assignees]}));
  assert.throws(() => taskSettings({...issue, labels: labels.filter(label => label.name !== '2026')}));
  assert.throws(() => taskSettings({...issue, labels: [...labels, catalog.find(label => label.name === 'difficulty/level2')]}));
  assert.throws(() => taskSettings({...issue, labels: [...labels, labels.find(label => label.name === '2026')]}));
  assert.throws(() => taskSettings({...issue, pull_request: {}}));
});
