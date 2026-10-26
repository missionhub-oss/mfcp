// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {marked} from 'marked';
import {governanceSchema} from '../scripts/lib/profile.mjs';
import {withMentorSignoffs} from '../scripts/lib/mentors.mjs';
import {updateMentorSection, readMentorCommands, assertMentorSection, mergeMentorConfigurations} from '../scripts/lib/mentor-section.mjs';

const fixture = JSON.parse(await readFile(new URL('./fixtures/mentor-configuration.json', import.meta.url), 'utf8'));
const governance = governanceSchema.parse(fixture.governance);
const record = governance.mentors.find(mentor => mentor.github_login === 'hongquan-prog');
const identity = {id: record.github_id, login: record.github_login};
const mentor = withMentorSignoffs(identity, governance);
const [command] = readMentorCommands(fixture.issue.body);
const configurations = [{mentor, commandUrl: command}];
const reference = `<!-- mfcp-mentor-command: ${JSON.stringify(command)} -->`;
const signature = `Signed-off-by: ${record.signoffs[0]}`;

test('a recorded task displays the registered mentor DCO without changing surrounding issue content', () => {
  const updated = updateMentorSection(fixture.issue.body, configurations);
  const code = marked.lexer(updated).filter(token => token.type === 'code');
  assert.deepEqual(code.map(token => token.text), record.signoffs.map(signoff => `Signed-off-by: ${signoff}`));
  assert.equal(updated.replace(`DCO:\n\n    ${signature}\n\n`, ''), fixture.issue.body);
  assert.deepEqual(readMentorCommands(updated), [command]);
  assert.equal(updateMentorSection(updated, configurations), updated);
  assert.doesNotThrow(() => assertMentorSection(updated, configurations));
});

test('existing mentor authorization remains valid and acquires DCO when reprocessed', () => {
  const visibleReference = fixture.issue.body.replace(reference, `[Configuration command](${command})`);
  for (const body of [fixture.issue.body, visibleReference]) {
    assert.doesNotThrow(() => assertMentorSection(body, configurations));
    const updated = updateMentorSection(body, configurations);
    assert.ok(updated.includes(signature));
    assert.deepEqual(readMentorCommands(updated), [command]);
    assert.ok(updated.includes(reference));
    assert.doesNotThrow(() => assertMentorSection(updated, configurations));
  }
});

test('a different registered signature cannot authorize a task and reconfiguration restores its DCO', () => {
  const other = governance.mentors.find(entry => entry.github_id !== mentor.id);
  const updated = updateMentorSection(fixture.issue.body, configurations);
  const changed = updated.replace(record.signoffs[0], other.signoffs[0]);
  assert.throws(() => assertMentorSection(changed, configurations), /differs/);
  assert.equal(updateMentorSection(changed, configurations), updated);
});

test('different mentors coexist while repeated identities keep one DCO entry and their original evidence', () => {
  const other = governance.mentors.find(entry => entry.github_id !== mentor.id);
  const second = {mentor: withMentorSignoffs({id: other.github_id, login: other.github_login}, governance),
    commandUrl: 'https://github.com/processmission-intern/mission-forge/issues/1#issuecomment-6328333205'};
  const both = mergeMentorConfigurations(configurations, second);
  const repeated = mergeMentorConfigurations(both, {...configurations[0], mentor: {...mentor, login: mentor.login.toUpperCase()}});
  assert.deepEqual(repeated, both);
  const updated = updateMentorSection(fixture.issue.body, repeated);
  assert.deepEqual(readMentorCommands(updated), [command, second.commandUrl]);
  assert.deepEqual(marked.lexer(updated).filter(token => token.type === 'code').map(token => token.text),
    [signature, `Signed-off-by: ${other.signoffs[0]}`]);
  assert.equal(updateMentorSection(updated, [...both, ...both]), updated);
  assert.doesNotThrow(() => assertMentorSection(updated, both));
});

test('mentor DCO selection uses the registered GitHub ID and requires a signature record', () => {
  for (const entry of governance.mentors) {
    const configured = withMentorSignoffs({id: entry.github_id, login: entry.github_login}, governance);
    assert.deepEqual(configured.signoffs, entry.signoffs);
    assert.notEqual(configured.signoffs, entry.signoffs);
  }
  const contributor = fixture.contributor;
  assert.throws(() => withMentorSignoffs({id: contributor.github_id, login: contributor.github_login}, governance), /Register one DCO signature record/);
});
