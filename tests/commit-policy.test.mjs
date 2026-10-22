// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCommitMessage, validateSubject, formatSignoff} from '../scripts/lib/commit-policy.mjs';

const email = 'chao.liu@processmission.com';
const name = 'Chao Liu';
const signature = formatSignoff(name, email);
const message = `ci: enforce signed commit messages\n\nCheck commit subjects, body width and author sign-offs.\n\n${signature}\n`;

test('DCO requires a final author signature and an explanatory body', () => {
  assert.doesNotThrow(() => validateCommitMessage(message, email));
  assert.throws(() => validateCommitMessage(message, '345823948+mfcp-progress[bot]@users.noreply.github.com'), /author/);
  assert.throws(() => validateCommitMessage(message.replace(signature, ''), email), /author/);
  assert.throws(() => validateCommitMessage(`ci: verify commits\n\n${signature}\n`, email), /explanatory/);
  assert.throws(() => validateCommitMessage(message + '\nText after the signature.\n', email), /author/);
});

test('all lines obey the subject and width rules including Unicode and whitespace', () => {
  assert.throws(() => validateSubject('Update README'), /module/);
  assert.doesNotThrow(() => validateSubject('docs: ' + '文'.repeat(66)));
  assert.throws(() => validateSubject('docs: ' + '文'.repeat(67)), /72/);
  assert.throws(() => validateCommitMessage(message.replace('Check commit subjects, body width and author sign-offs.', 'x'.repeat(73)), email), /72/);
  assert.throws(() => validateCommitMessage(message.replace('Check', '\tCheck'), email), /tabs/);
  assert.throws(() => validateCommitMessage(message.replace('sign-offs.', 'sign-offs. '), email), /whitespace/);
});

test('long bot DCO values retain their identity through Git trailer unfolding', () => {
  const botEmail = '345823948+mfcp-progress[bot]@users.noreply.github.com';
  const botSignature = formatSignoff('mfcp-progress[bot]', botEmail);
  assert.ok(botSignature.includes('\n '));
  assert.doesNotThrow(() => validateCommitMessage(message.replace(signature, botSignature), botEmail));
});
