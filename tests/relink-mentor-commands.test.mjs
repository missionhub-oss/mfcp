// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { relinkMentorCommands, LEGACY_REPOSITORY } from '../scripts/relink-mentor-commands.mjs';

const command = url => `<!-- mfcp-mentor-command: "${url}" -->`;

test('rewrites mentor command links from the legacy repository name', () => {
  const old = command(`https://github.com/${LEGACY_REPOSITORY}/issues/15#issuecomment-6328283665`);
  const next = relinkMentorCommands(old);
  assert.ok(next.includes('https://github.com/missionhub-oss/mfcp/issues/15#issuecomment-6328283665'));
  assert.ok(!next.includes(LEGACY_REPOSITORY));
});

test('leaves current links, other links and text alone', () => {
  const body = [
    command('https://github.com/missionhub-oss/mfcp/issues/15#issuecomment-1'),
    `See https://github.com/${LEGACY_REPOSITORY}/issues/15 for history.`,
    'No link here.',
  ].join('\n');
  assert.equal(relinkMentorCommands(body), body);
});

test('rewrites every mentor command link in one body', () => {
  const body = [
    command(`https://github.com/${LEGACY_REPOSITORY}/issues/7#issuecomment-1`),
    command(`https://github.com/${LEGACY_REPOSITORY}/issues/7#issuecomment-2`),
  ].join('\n');
  const next = relinkMentorCommands(body, 'missionhub-oss/mfcp');
  assert.equal((next.match(/missionhub-oss\/mfcp/g) ?? []).length, 2);
  assert.ok(!next.includes(LEGACY_REPOSITORY));
});
