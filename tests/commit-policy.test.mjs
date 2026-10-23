// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CommitPolicyError, validateCommitMessage, validateSubject, formatSignoff} from '../scripts/lib/commit-policy.mjs';

const email = 'chao.liu@processmission.com';
const name = 'Chao Liu';
const signature = formatSignoff(name, email);
const message = `ci: enforce signed commit messages\n\nCheck commit subjects, body width and author sign-offs.\n\n${signature}\n`;
const hasProblem = code => error => error instanceof CommitPolicyError && error.problems.some(problem => problem.code === code);

test('DCO requires a final author signature and an explanatory body', () => {
  assert.doesNotThrow(() => validateCommitMessage(message, email));
  assert.throws(() => validateCommitMessage(message, '345823948+mfcp-progress[bot]@users.noreply.github.com'), hasProblem('author-signoff'));
  assert.throws(() => validateCommitMessage(message.replace(signature, ''), email), hasProblem('author-signoff'));
  assert.throws(() => validateCommitMessage(`ci: verify commits\n\n${signature}\n`, email), hasProblem('body-missing'));
  assert.throws(() => validateCommitMessage(message + '\nText after the signature.\n', email), hasProblem('author-signoff'));
});

test('all lines obey the subject and width rules including Unicode and whitespace', () => {
  assert.throws(() => validateSubject('Update README'), hasProblem('subject-format'));
  assert.doesNotThrow(() => validateSubject('docs: ' + '文'.repeat(66)));
  assert.throws(() => validateSubject('docs: ' + '文'.repeat(67)), hasProblem('line-length'));
  assert.throws(() => validateCommitMessage(message.replace('Check commit subjects, body width and author sign-offs.', 'x'.repeat(73)), email), hasProblem('line-length'));
  assert.throws(() => validateCommitMessage(message.replace('Check', '\tCheck'), email), hasProblem('tab'));
  assert.throws(() => validateCommitMessage(message.replace('sign-offs.', 'sign-offs. '), email), hasProblem('trailing-whitespace'));
});

test('long bot DCO values retain their identity through Git trailer unfolding', () => {
  const botEmail = '345823948+mfcp-progress[bot]@users.noreply.github.com';
  const botSignature = formatSignoff('mfcp-progress[bot]', botEmail);
  assert.ok(botSignature.includes('\n '));
  assert.doesNotThrow(() => validateCommitMessage(message.replace(signature, botSignature), botEmail));
});

test('PR 33 reports its carriage return and missing author signoff together', async () => {
  const commit = JSON.parse(await readFile(new URL('fixtures/pr33-commit.json', import.meta.url), 'utf8'));
  assert.throws(() => validateCommitMessage(commit.message, commit.author_email, {commit: commit.sha}), error => {
    assert.ok(error instanceof CommitPolicyError);
    assert.deepEqual(error.problems.map(problem => problem.code), ['carriage-return', 'author-signoff']);
    assert.equal(error.problems[0].line, 3);
    assert.equal(error.problems[0].column, 66);
    assert.equal(error.problems[0].commit, commit.sha);
    assert.ok(error.problems[0].excerpt.endsWith('\\r"'));
    assert.ok(error.problems.every(problem => problem.fix));
    return true;
  });
});

test('CRLF diagnostics do not misreport a valid author signoff as missing', () => {
  assert.throws(() => validateCommitMessage(message.replaceAll('\n', '\r\n'), email), error => {
    assert.ok(error instanceof CommitPolicyError);
    assert.ok(error.problems.length > 0);
    assert.ok(error.problems.every(problem => problem.code === 'carriage-return'));
    return true;
  });
});
