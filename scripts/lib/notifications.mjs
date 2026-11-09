// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import { activeSettlement, digest, participantPath, validateProfile } from './profile.mjs';
import { isTrustedBotComment } from './bot-identity.mjs';
import {isTaskIssue} from './issue-types.mjs';
import {z} from 'zod';
import {isRateLimited} from './processing-state.mjs';

export const notificationStateSchema = z.strictObject({
  version: z.literal(1).default(1),
  delivered: z.record(z.string().regex(/^[a-f0-9]{64}$/), z.strictObject({
    issue: z.number().int().positive(), url: z.url(), verified_at: z.iso.datetime(),
  })).default({}),
});

export function notificationsFor(profile) {
  const p = validateProfile(profile, participantPath(profile.github_login));
  const messages = [];
  const mention = `@${p.github_login}`;
  for (const task of p.contributions) {
    const settlement = activeSettlement(p, task);
    if (!settlement) continue;
    messages.push({
      kind: 'completion', issue: task.issue,
      key: digest({participant: p.github_id, kind: 'completion', record: settlement.id}),
      body: `🎉 Congratulations, ${mention}! You've completed this task and your contribution has been accepted!\n\n` +
        `You turned this task into an upstream contribution that others can build on. Excellent work seeing it through review and merge — thank you for the care and persistence you brought to it!\n\n` +
        `**Experience earned: +${settlement.points} XP** · **Task difficulty: L${task.difficulty}**\n\n` +
        'This is how an open-source contributor grows: one real contribution at a time. Keep going — we look forward to what you build next!',
    });
  }
  for (const promotion of p.promotions) {
    const source = promotion.proof.source;
    const issue = source.kind === 'registration' ? source.pr : source.issue;
    if (!issue) throw new Error('Promotion notification needs its original issue or registration PR.');
    const welcome = promotion.to === 1
      ? "You've forked the repository, submitted your own registration PR, and brought it through to merge — a great first step in open-source collaboration! Welcome to the Mission Forge Contributor Program (MFCP). We're glad you're here, and we look forward to learning and contributing alongside you!"
      : 'Your contributions and growth have earned you this new level. Thank you for the care and effort you bring to the community!';
    messages.push({
      kind: 'promotion', issue,
      afterCompletion: promotion.to === 2 && source.kind !== 'registration',
      key: digest({participant: p.github_id, kind: 'promotion', record: promotion.id}),
      body: `🚀 Congratulations, ${mention}! You've advanced from **L${promotion.from} to L${promotion.to}**!\n\n` +
        `${welcome}\n\nYour promotion is now recorded in your contributor profile. Well earned — keep exploring, sharing what you learn, and helping the community move forward!`,
    });
  }
  return messages;
}

const marker = message => `<!-- mfcp-notification:${message.key} -->`;
export const notificationDelivered = (message, state) => state.delivered[message.key]?.issue === message.issue;

export async function deliverNotifications(client, profiles, {appId, slug, write = false,
  state = notificationStateSchema.parse({}), checkpoint = async () => {}} = {}) {
  if (!Number.isSafeInteger(appId) || appId <= 0 || !/^[a-z0-9-]+$/.test(slug ?? '')) {
    throw new Error('A valid GitHub App ID and slug are required.');
  }
  const results = [];
  const commentsByIssue = new Map();
  const pendingCompletions = new Set();
  let limited = false;
  for (const {profile} of profiles) {
    for (const message of notificationsFor(profile)) {
      try {
        if (notificationDelivered(message, state)) {
          results.push({kind: message.kind, issue: message.issue, status: 'already-notified', cached: true});
          continue;
        }
        if (limited) {
          results.push({kind: message.kind, issue: message.issue, status: 'deferred', reason: 'API rate limit; retry after reset.'});
          continue;
        }
        if (message.afterCompletion && pendingCompletions.has(message.issue)) {
          results.push({kind: message.kind, issue: message.issue, status: 'completion-notice-pending'});
          continue;
        }
        if (message.kind === 'completion' || message.afterCompletion) {
          const issue = await client.request(`${client.root}/issues/${message.issue}`);
          if (!isTaskIssue(issue) || issue.state !== 'closed' || issue.state_reason !== 'completed') {
            if (message.kind === 'completion') pendingCompletions.add(message.issue);
            results.push({kind: message.kind, issue: message.issue, status: 'task-not-completed'});
            continue;
          }
        }
        let comments = commentsByIssue.get(message.issue);
        if (!comments) {
          comments = await client.list(`${client.root}/issues/${message.issue}/comments`);
          commentsByIssue.set(message.issue, comments);
        }
        const exists = comments.find(comment =>
          isTrustedBotComment(comment, appId) && comment.body?.includes(marker(message)));
        if (exists) {
          state.delivered[message.key] = {issue: message.issue, url: exists.html_url,
            verified_at: new Date().toISOString()};
          await checkpoint();
          results.push({kind: message.kind, issue: message.issue, status: 'already-notified'});
          continue;
        }
        if (!write) {
          results.push({kind: message.kind, issue: message.issue, status: 'pending', body: message.body});
          continue;
        }
        const comment = await client.request(`${client.root}/issues/${message.issue}/comments`, 'POST', {
          body: `${message.body}\n\n${marker(message)}`,
        });
        comments.push(comment);
        if (!isTrustedBotComment(comment, appId)) throw new Error('GitHub did not confirm the notification bot identity.');
        state.delivered[message.key] = {issue: message.issue, url: comment.html_url,
          verified_at: new Date().toISOString()};
        await checkpoint();
        results.push({kind: message.kind, issue: message.issue, status: 'notified', url: comment.html_url});
      } catch (error) {
        if (isRateLimited(error)) limited = true;
        if (message.kind === 'completion') pendingCompletions.add(message.issue);
        results.push({kind: message.kind, issue: message.issue, status: 'failed', reason: error.message});
      }
    }
  }
  return results;
}
