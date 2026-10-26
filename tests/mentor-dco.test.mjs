// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {marked} from 'marked';
import {governanceSchema} from '../scripts/lib/profile.mjs';
import {withMentorSignoffs} from '../scripts/lib/mentors.mjs';
import {updateMentorSection, readMentorCommand, assertMentorSection} from '../scripts/lib/mentor-section.mjs';

const fixture = JSON.parse(await readFile(new URL('./fixtures/mentor-configuration.json', import.meta.url), 'utf8'));
const governance = governanceSchema.parse(fixture.governance);
const record = governance.mentors.find(mentor => mentor.github_login === 'hongquan-prog');
const identity = {id: record.github_id, login: record.github_login};
const mentor = withMentorSignoffs(identity, governance);
const command = readMentorCommand(fixture.issue.body);
const reference = `<!-- mfcp-mentor-command: ${JSON.stringify(command)} -->`;
const signature = `Signed-off-by: ${record.signoffs[0]}`;

test('a recorded task displays the registered mentor DCO without changing surrounding issue content', () => {
  const updated = updateMentorSection(fixture.issue.body, mentor, command);
  const code = marked.lexer(updated).filter(token => token.type === 'code');
  assert.deepEqual(code.map(token => token.text), record.signoffs.map(signoff => `Signed-off-by: ${signoff}`));
  assert.equal(updated.replace(`DCO:\n\n    ${signature}\n\n`, ''), fixture.issue.body);
  assert.equal(readMentorCommand(updated), command);
  assert.equal(updateMentorSection(updated, mentor, command), updated);
  assert.doesNotThrow(() => assertMentorSection(updated, mentor, command));
});

test('existing mentor authorization remains valid and acquires DCO when reprocessed', () => {
  const visibleReference = fixture.issue.body.replace(reference, `[Configuration command](${command})`);
  for (const body of [fixture.issue.body, visibleReference]) {
    assert.doesNotThrow(() => assertMentorSection(body, mentor, command));
    const updated = updateMentorSection(body, mentor, command);
    assert.ok(updated.includes(signature));
    assert.equal(readMentorCommand(updated), command);
    assert.ok(updated.includes(reference));
    assert.doesNotThrow(() => assertMentorSection(updated, mentor, command));
  }
});

test('a different registered signature cannot authorize a task and reconfiguration restores its DCO', () => {
  const other = governance.mentors.find(entry => entry.github_id !== mentor.id);
  const updated = updateMentorSection(fixture.issue.body, mentor, command);
  const changed = updated.replace(record.signoffs[0], other.signoffs[0]);
  assert.throws(() => assertMentorSection(changed, mentor, command), /differs/);
  assert.equal(updateMentorSection(changed, mentor, command), updated);
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
