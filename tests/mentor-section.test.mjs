// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {marked} from 'marked';
import {updateMentorSection, readMentorCommands, assertMentorSection} from '../scripts/lib/mentor-section.mjs';

const mentor = {id: 81150281, login: 'hongquan-prog'};
const command = 'https://github.com/processmission-intern/mission-forge/issues/15#issuecomment-6328283665';
const configurations = [{mentor, commandUrl: command}];
const guidance = 'A mentor is needed to confirm the upstream scope, coordinate with the Zephyr timer maintainer, agree the platform and test placement, and provide DCO sign-off.';
const schedule = '### Schedule / 时间安排\n\nAvailable after mentor confirmation and scope agreement. No deadline assigned.\n';
const body = `### Mentor / 导师\n\nTBD. ${guidance}\n\n${schedule}`;

test('mentor updates reuse the form field and preserve guidance and adjacent sections', () => {
  const updated = updateMentorSection(body, configurations);
  assert.equal(updated.split('### Mentor / 导师').length, 2);
  assert.ok(updated.includes(guidance));
  assert.ok(updated.endsWith(schedule));
  assert.ok(!updated.includes('TBD'));
  assert.deepEqual(readMentorCommands(updated), [command]);
  assert.equal(updateMentorSection(updated, configurations), updated);
  assert.doesNotThrow(() => assertMentorSection(updated, configurations));
  const changed = updateMentorSection(updated, [...configurations, {
    mentor: {id: 62325246, login: 'zevorn'},
    commandUrl: 'https://github.com/processmission-intern/mission-forge/issues/1#issuecomment-6328333205',
  }]);
  assert.ok(changed.includes('[@zevorn]'));
  assert.ok(changed.includes('[@hongquan-prog]'));
  assert.throws(() => assertMentorSection(changed, configurations), /differs/);
});

test('missing, duplicate and misplaced configuration sections cannot authorize acceptance', () => {
  assert.throws(() => readMentorCommands(body), /Configure a mentor/);
  assert.throws(() => updateMentorSection(body + body, configurations), /duplicate/);
  const updated = updateMentorSection(body, configurations);
  assert.throws(() => updateMentorSection(updated + updated, configurations), /duplicate/);
  assert.throws(() => assertMentorSection(updated.replace('### Mentor / 导师', '### References / 参考资料'), configurations), /must stay inside/);
  assert.throws(() => readMentorCommands(updated.replace('mfcp-mentor-command:', 'other-reference:')), /configuration command/);
});

test('command evidence stays in an HTML comment and visible references migrate safely', () => {
  const updated = updateMentorSection(body, configurations);
  const visible = marked.lexer(updated).filter(token => token.type !== 'html').map(token => token.raw).join('');
  assert.ok(!visible.includes(command));
  assert.ok(!visible.includes('Configuration command'));
  assert.deepEqual(readMentorCommands(updated), [command]);
  const legacy = updated.replace(`<!-- mfcp-mentor-command: ${JSON.stringify(command)} -->`, `[Configuration command](${command})`);
  assert.deepEqual(readMentorCommands(legacy), [command]);
  assert.doesNotThrow(() => assertMentorSection(legacy, configurations));
  assert.equal(updateMentorSection(legacy, configurations), updated);
});

test('a missing form field is added once and code examples are preserved', () => {
  const existing = '```markdown\n### Mentor / 导师\nTBD\n```\n';
  const updated = updateMentorSection(existing, configurations);
  assert.ok(updated.startsWith(existing));
  assert.equal(updateMentorSection(updated, configurations), updated);
});
