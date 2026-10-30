// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {activeSettlement, digest, equal, normalizeProfile, participantPath} from './profile.mjs';
import {parseCommand, taskSettings} from './commands.mjs';

export function completionPatch(issue, profile, source, events) {
  const task = profile.contributions.find(record => record.issue === issue.number);
  const settlement = task && activeSettlement(profile, task);
  if (!settlement || !equal(settlement.proof.source, source) || issue.state !== 'open') return null;
  if (events.some(event => event.event === 'reopened' && Date.parse(event.created_at) >= Date.parse(settlement.proof.at))) return null;
  const settings = taskSettings(issue, {at: settlement.proof.at, recordedYear: Number(task.policy.id.split('.')[0])});
  if (settings.participant_id !== profile.github_id || settings.difficulty !== task.difficulty || settings.year !== Number(task.policy.id.split('.')[0])) {
    throw new Error('Task fields changed after settlement; inspect the issue before closing it.');
  }
  return {state: 'closed', state_reason: 'completed'};
}

export async function completeSettledTask(client, source, slug) {
  if (source.kind !== 'comment') return null;
  const comment = await client.request(`${client.root}/issues/comments/${source.comment}`);
  if (parseCommand(comment.body, slug)?.action !== 'settle') return null;
  const issue = await client.request(`${client.root}/issues/${source.issue}`);
  if (issue.state !== 'open' || issue.assignees.length !== 1) return null;
  const path = participantPath(issue.assignees[0].login);
  const profile = normalizeProfile((await client.file(path, await client.head())).value, path);
  const task = profile.contributions.find(record => record.issue === source.issue);
  const settlement = task && activeSettlement(profile, task);
  if (!settlement || !equal(settlement.proof.source, source)) return null;
  try {
    if (comment.created_at !== comment.updated_at || settlement.proof.digest !== digest(comment.body)) {
      throw new Error('The settlement command changed after publication.');
    }
    const events = await client.list(`${client.root}/issues/${source.issue}/events`);
    const patch = completionPatch(issue, profile, source, events);
    if (!patch) return null;
    const updated = await client.request(`${client.root}/issues/${source.issue}`, 'PATCH', patch);
    if (updated.state !== 'closed' || updated.state_reason !== 'completed') throw new Error('GitHub did not confirm completion.');
    return {issue: issue.number, url: updated.html_url, status: 'completed'};
  } catch (error) {
    throw new Error(`Settlement is recorded; automatic closure is pending. ${error.message}`, {cause: error});
  }
}
