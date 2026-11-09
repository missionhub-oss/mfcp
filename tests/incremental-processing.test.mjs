// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, mkdtemp, readFile, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {notificationDelivered, notificationsFor, notificationStateSchema} from '../scripts/lib/notifications.mjs';
import {reusableCheck, validationFingerprint, prCheckStateSchema} from '../scripts/lib/pr-checks.mjs';
import {readProcessingState, saveProcessingState, isRateLimited, overlapSince} from '../scripts/lib/processing-state.mjs';
import {completedRegistrationPRs, reconciliationStateSchema, sourceKey, prepareReconciliationState} from '../scripts/lib/reconciliation.mjs';
import {readProfileSnapshot} from '../scripts/lib/profile-snapshot.mjs';
import {isTrustedBotComment} from '../scripts/lib/bot-identity.mjs';

const evidence = JSON.parse(await readFile(new URL('./fixtures/incremental-evidence.json', import.meta.url), 'utf8'));
const profile = JSON.parse(await readFile(new URL('../participants/asymecat.json', import.meta.url), 'utf8'));

test('successful PR checks are reused only for their verified revision and update time', () => {
  const {pr, check, trusted_ref: ref} = evidence;
  const record = {fingerprint: validationFingerprint(pr, ref), updated_at: pr.updated_at,
    checks: {[check.name]: check.id}};
  assert.equal(reusableCheck(pr, ref, record, check), true);
  const {changed_files, ...listItem} = pr;
  assert.equal(reusableCheck(listItem, ref, record, check), false);
  assert.equal(reusableCheck(pr, ref, {...record, updated_at: pr.created_at}, check), false);
  assert.equal(reusableCheck(pr, pr.head.sha, record, check), false);
  assert.equal(reusableCheck(pr, ref, {...record, checks: {}}, check), false);
  assert.equal(reusableCheck(pr, ref, undefined, check), false);
  const withoutCheck = {...check, head_sha: pr.base.sha};
  assert.equal(reusableCheck(pr, ref, record, withoutCheck), false);
});

test('confirmed notification receipts survive new profile scans and leave pending messages eligible', async () => {
  const state = notificationStateSchema.parse({});
  const messages = notificationsFor(profile);
  const message = messages.find(message => message.kind === 'completion' && message.issue === 154);
  assert.ok(isTrustedBotComment(evidence.notification, 5410846, 345823948));
  assert.ok(evidence.notification.body.includes(`<!-- mfcp-notification:${message.key} -->`));
  assert.equal(notificationDelivered(message, state), false);
  state.delivered[message.key] = {issue: message.issue, url: evidence.notification.html_url,
    verified_at: evidence.notification.created_at};
  await mkdir('.mfcp-runtime', {recursive: true});
  const directory = await mkdtemp('.mfcp-runtime/notification-receipts-');
  try {
    const path = join(directory, 'state.json');
    await saveProcessingState(path, state, notificationStateSchema);
    const restored = await readProcessingState(path, notificationStateSchema);
    assert.equal(notificationDelivered(message, restored), true);
    for (const pending of messages.filter(item => item.key !== message.key)) {
      assert.equal(notificationDelivered(pending, restored), false);
    }
    assert.deepEqual(await readProcessingState(join(directory, 'missing.json'), notificationStateSchema), notificationStateSchema.parse({}));
  } finally {await rm(directory, {recursive: true, force: true});}
});

test('update cursors overlap while unfinished sources remain explicit retry entries', async () => {
  const source = profile.contributions.find(task => task.issue === 154).settlements[0].proof.source;
  const state = reconciliationStateSchema.parse({since: evidence.notification.created_at,
    pending: {[sourceKey(source)]: {source, fingerprint: evidence.notification.html_url}}});
  assert.equal(Date.parse(state.since) - Date.parse(overlapSince(state.since)), 60_000);
  assert.deepEqual(state.pending[sourceKey(source)].source, source);
  prepareReconciliationState(state, evidence.trusted_ref);
  state.completed[sourceKey(source)] = evidence.notification.html_url;
  prepareReconciliationState(state, evidence.pr.head.sha);
  assert.equal(state.since, null);
  assert.equal(state.revalidate, true);
  assert.deepEqual(state.completed, {});
  assert.deepEqual(state.pending[sourceKey(source)].source, source);
  assert.equal(overlapSince(null), null);
  const snapshot = readProfileSnapshot();
  const registered = completedRegistrationPRs(snapshot.profiles);
  for (const {profile} of snapshot.profiles) {
    for (const promotion of profile.promotions.filter(p => p.proof.source.kind === 'registration')) {
      assert.ok(registered.has(promotion.proof.source.pr));
    }
  }
  assert.equal(isRateLimited(evidence.rate_limit), true);
  assert.equal(isRateLimited({cause: evidence.rate_limit}), true);
  assert.equal(isRateLimited(null), false);
  assert.deepEqual(prCheckStateSchema.parse({}).prs, {});
});
