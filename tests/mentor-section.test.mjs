// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {marked} from 'marked';
import {updateMentorSection, readMentorCommand, assertMentorSection} from '../scripts/lib/mentor-section.mjs';

const mentor = {login: 'hongquan-prog'};
const command = 'https://github.com/processmission-intern/mission-forge/issues/15#issuecomment-6328159295';
const guidance = 'A mentor is needed to confirm the upstream scope, coordinate with the Zephyr timer maintainer, agree the platform and test placement, and provide DCO sign-off.';
const schedule = '### Schedule / 时间安排\n\nAvailable after mentor confirmation and scope agreement. No deadline assigned.\n';
const body = `### Mentor / 导师\n\nTBD. ${guidance}\n\n${schedule}`;

test('mentor updates reuse the form field and preserve guidance and adjacent sections', () => {
  const updated = updateMentorSection(body, mentor, command);
  assert.equal(updated.split('### Mentor / 导师').length, 2);
  assert.ok(updated.includes(guidance));
  assert.ok(updated.endsWith(schedule));
  assert.ok(!updated.includes('TBD'));
  assert.equal(readMentorCommand(updated), command);
  assert.equal(updateMentorSection(updated, mentor, command), updated);
  assert.doesNotThrow(() => assertMentorSection(updated, mentor, command));
  const changed = updateMentorSection(updated, {login: 'zevorn'}, command);
  assert.ok(changed.includes('[@zevorn]'));
  assert.ok(!changed.includes('[@hongquan-prog]'));
  assert.throws(() => assertMentorSection(changed, mentor, command), /differs/);
});

test('missing, duplicate and misplaced configuration sections cannot authorize acceptance', () => {
  assert.throws(() => readMentorCommand(body), /Configure a mentor/);
  assert.throws(() => updateMentorSection(body + body, mentor, command), /duplicate/);
  const updated = updateMentorSection(body, mentor, command);
  assert.throws(() => updateMentorSection(updated + updated, mentor, command), /duplicate/);
  assert.throws(() => assertMentorSection(updated.replace('### Mentor / 导师', '### References / 参考资料'), mentor, command), /must stay inside/);
  assert.throws(() => readMentorCommand(updated.replace('mfcp-mentor-command:', 'other-reference:')), /one configuration/);
});

test('command evidence stays in an HTML comment and visible references migrate safely', () => {
  const updated = updateMentorSection(body, mentor, command);
  const visible = marked.lexer(updated).filter(token => token.type !== 'html').map(token => token.raw).join('');
  assert.ok(!visible.includes(command));
  assert.ok(!visible.includes('Configuration command'));
  assert.equal(readMentorCommand(updated), command);
  const legacy = updated.replace(`<!-- mfcp-mentor-command: ${JSON.stringify(command)} -->`, `[Configuration command](${command})`);
  assert.equal(readMentorCommand(legacy), command);
  assert.doesNotThrow(() => assertMentorSection(legacy, mentor, command));
  assert.equal(updateMentorSection(legacy, mentor, command), updated);
});

test('a missing form field is added once and code examples are preserved', () => {
  const existing = '```markdown\n### Mentor / 导师\nTBD\n```\n';
  const updated = updateMentorSection(existing, mentor, command);
  assert.ok(updated.startsWith(existing));
  assert.equal(updateMentorSection(updated, mentor, command), updated);
});
