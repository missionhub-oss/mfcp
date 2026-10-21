// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { isBotCommand, parseCommand } from '../scripts/lib/commands.mjs';
import { formatCommandFeedback, errorOutcome } from '../scripts/lib/command-feedback.mjs';
import { isTrustedBotComment } from '../scripts/lib/bot-identity.mjs';
import { reactionForOutcome } from '../scripts/lib/command-reactions.mjs';

test('trusted bot identity rejects conflicting application and human identities', () => {
  const comment = {user: {type: 'Bot', id: 345823948}};
  assert.equal(isTrustedBotComment(comment, 5410846, 345823948), true);
  assert.equal(isTrustedBotComment(comment, 5410846, undefined), false);
  assert.equal(isTrustedBotComment({...comment, performed_via_github_app: {id: 15368}}, 5410846, 345823948), false);
  assert.equal(isTrustedBotComment({user: {type: 'User', id: 62325246}}, 5410846, 345823948), false);
});

test('command reactions distinguish completed writes from pending review and failures', () => {
  for (const status of ['assigned', 'mentor-configured', 'published', 'evidence-recorded', 'already-merged']) assert.equal(reactionForOutcome(status), '+1');
  for (const status of ['processing', 'waiting', 'awaiting-review', 'auto-merge-enabled']) assert.equal(reactionForOutcome(status), 'eyes');
  for (const status of ['failed', 'unchanged']) assert.equal(reactionForOutcome(status), null);
});

const repository = 'processmission-intern/mission-forge';

test('malformed addressed commands reach error reporting without executing quoted examples', () => {
  assert.equal(isBotCommand('@mfcp-progress configure', 'mfcp-progress'), true);
  assert.throws(() => parseCommand('@mfcp-progress configure', 'mfcp-progress'));
  assert.equal(isBotCommand('> @mfcp-progress configure', 'mfcp-progress'), false);
  assert.equal(isBotCommand('```\n@mfcp-progress configure\n```', 'mfcp-progress'), false);
  assert.equal(isBotCommand('@other-bot configure', 'mfcp-progress'), false);
});

test('feedback separates confirmed changes, pending conditions and failures', () => {
  const comment = {id: 6315777115, user: {login: 'zevorn'},
    html_url: `https://github.com/${repository}/pull/14#issuecomment-6315777115`,
    body: 'LGTM, Thanks!'};
  const assigned = formatCommandFeedback(comment, {status: 'assigned', assignee: 'hongquan-prog'}, repository);
  assert.match(assigned, /✅ Assignment confirmed/);
  assert.match(assigned, /Assignee: `hongquan-prog`/);
  assert.match(assigned, /@zevorn/);
  assert.ok(assigned.includes(comment.html_url));
  assert.match(assigned, /mfcp-command:6315777115/);
  const waiting = formatCommandFeedback(comment, {status: 'awaiting-review', url: `https://github.com/${repository}/pull/24`}, repository);
  assert.match(waiting, /⏳/);
  assert.doesNotMatch(waiting, /:success -->/);
  const failed = formatCommandFeedback(comment, {status: 'failed', reason: 'Invalid @other `argument` <value>'}, repository);
  assert.match(failed, /❌/);
  assert.doesNotMatch(failed, /@other/);
  assert.doesNotMatch(failed, /<value>/);
  assert.doesNotMatch(failed, /:success -->/);
});

test('syntax failures explain fields and pending checks remain pending', () => {
  let failure;
  try {parseCommand('@mfcp-progress settle', 'mfcp-progress');} catch (error) {failure = error;}
  assert.equal(errorOutcome(failure).status, 'failed');
  assert.match(errorOutcome(failure).reason, /pull_requests/);
  assert.equal(errorOutcome(new Error('Candidate checks are pending; rerun or wait for scheduled reconciliation.')).status, 'waiting');
  assert.equal(errorOutcome(new Error('Only active members may execute commands.')).status, 'failed');
});
