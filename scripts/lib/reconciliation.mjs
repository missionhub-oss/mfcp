// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {z} from 'zod';
import {execFileSync} from 'node:child_process';
import {activeSettlement, digest} from './profile.mjs';
import {readProfiles} from './progression.mjs';
import {isBotCommand} from './commands.mjs';
import {isTaskIssue} from './issue-types.mjs';
import {isRateLimited, overlapSince} from './processing-state.mjs';

const id = z.number().int().positive();
const sourceSchema = z.discriminatedUnion('kind', [
  z.strictObject({kind: z.literal('comment'), issue: id, comment: id}),
  z.strictObject({kind: z.literal('registration'), pr: id}),
  z.strictObject({kind: z.literal('reopened'), issue: id, event: id}),
  z.strictObject({kind: z.literal('completed'), issue: id, event: id}),
]);
export const reconciliationStateSchema = z.strictObject({
  version: z.literal(1).default(1), scope: z.string().default(''),
  revalidate: z.boolean().default(false),
  since: z.iso.datetime().nullable().default(null),
  completed: z.record(z.string(), z.string()).default({}),
  pending: z.record(z.string(), z.strictObject({source: sourceSchema, fingerprint: z.string()})).default({}),
});

export const sourceKey = source => JSON.stringify(source);
export const commandFingerprint = comment => digest({body: comment.body, updated_at: comment.updated_at});
export const reconciliationScope = () => execFileSync('git', ['rev-parse',
  'HEAD:scripts', 'HEAD:programs', 'HEAD:package-lock.json'], {encoding: 'utf8'}).trim();

export function prepareReconciliationState(state, scope) {
  if (state.scope && state.scope !== scope) {
    state.since = null;
    state.completed = {};
    state.revalidate = true;
  }
  state.scope = scope;
  return state;
}

export function completedRegistrationPRs(profiles) {
  return new Set(profiles.flatMap(({profile}) => profile.promotions
    .filter(promotion => promotion.proof.source.kind === 'registration')
    .map(promotion => promotion.proof.source.pr)));
}

export async function collectReconciliationWork(client, state, {slug, botId, full = false, snapshot} = {}) {
  const started = new Date().toISOString();
  const ref = await client.head();
  const profiles = snapshot?.ref === ref ? snapshot.profiles : await readProfiles(client, ref);
  const registered = completedRegistrationPRs(profiles);
  const work = new Map(Object.entries(state.pending));
  const since = full ? null : overlapSince(state.since);
  const issues = await client.list(`${client.root}/issues?state=all&sort=updated&direction=desc` +
    (since ? `&since=${encodeURIComponent(since)}` : ''));
  const add = (source, fingerprint) => {
    const key = sourceKey(source);
    if (state.completed[key] !== fingerprint || state.pending[key]) work.set(key, {source, fingerprint});
  };
  for (const issue of issues) {
    if (issue.pull_request) {
      if (registered.has(issue.number) || issue.user.type === 'Bot' && issue.state !== 'open') continue;
      const pr = await client.request(`${client.root}/pulls/${issue.number}`);
      if (pr.state === 'open' && pr.user.login === `${slug}[bot]` && pr.head.ref.startsWith('progress/review/')) {
        const files = await client.list(`${client.root}/pulls/${pr.number}/files`);
        if (files.length !== 1) continue;
        const profile = (await client.file(files[0].filename, pr.head.sha)).value;
        if (profile.last_event) add(profile.last_event, digest({pr: pr.number, head: pr.head.sha, updated_at: pr.updated_at}));
      } else if (pr.merged_at && pr.user.type === 'User' && pr.changed_files === 1) {
        const files = await client.list(`${client.root}/pulls/${pr.number}/files`);
        if (files.length === 1 && files[0].filename === `participants/${pr.user.login.toLowerCase()}.json`) {
          add({kind: 'registration', pr: pr.number}, digest({merge: pr.merge_commit_sha}));
        }
      }
      continue;
    }
    if (!isTaskIssue(issue)) continue;
    const comments = await client.list(`${client.root}/issues/${issue.number}/comments`);
    for (const comment of comments) {
      if (comment.user.type !== 'User' || !isBotCommand(comment.body, slug)) continue;
      const source = {kind: 'comment', issue: issue.number, comment: comment.id};
      const key = sourceKey(source), fingerprint = commandFingerprint(comment);
      if (state.completed[key] === fingerprint && !state.pending[key]) continue;
      if (!full && !state.pending[key] && comment.created_at === comment.updated_at) {
        const reactions = await client.list(`${client.root}/issues/comments/${comment.id}/reactions`);
        if (reactions.some(reaction => reaction.user?.type === 'Bot' && reaction.user.id === botId && reaction.content === '+1')) {
          state.completed[key] = fingerprint;
          continue;
        }
      }
      add(source, fingerprint);
    }
    const owner = profiles.find(({profile}) => profile.contributions.some(task =>
      task.issue === issue.number && activeSettlement(profile, task)));
    if (issue.state === 'open' && owner) {
      const events = await client.list(`${client.root}/issues/${issue.number}/events`);
      const event = events.filter(event => event.event === 'reopened').at(-1);
      if (event) add({kind: 'reopened', issue: issue.number, event: event.id}, digest(event.id));
    }
  }
  return {started, issues: issues.length, work: [...work.values()]};
}

const completedStatuses = new Set(['published', 'unchanged', 'already-merged',
  'mentor-configured', 'assigned', 'evidence-recorded', 'review-declined']);

export async function processReconciliationWork(client, work, state, processSource,
  {write = false, checkpoint = async () => {}} = {}) {
  const reports = [];
  for (const item of work) state.pending[sourceKey(item.source)] = item;
  await checkpoint();
  for (const item of work) {
    const key = sourceKey(item.source);
    try {
      const result = await processSource(client, item.source, {write});
      reports.push(result);
      if (completedStatuses.has(result.status)) {
        state.completed[key] = item.fingerprint;
        delete state.pending[key];
      }
    } catch (error) {
      reports.push({status: 'pending', source: item.source, reason: error.message});
      if (isRateLimited(error)) {await checkpoint(); break;}
    }
    await checkpoint();
  }
  return reports;
}
