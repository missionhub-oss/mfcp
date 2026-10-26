// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {isTaskIssue} from './issue-types.mjs';

export function validateAssignment(issue, participant, profiles, comments) {
  if (!isTaskIssue(issue)) throw new Error('Set the native issue type to Task before assigning a contributor.');
  if (participant.type !== 'User' || !profiles.some(record => record.profile.github_id === participant.id &&
      record.profile.github_login.toLowerCase() === participant.login.toLowerCase())) throw new Error('The assignee must have a matching registration.');
  if (issue.user.id !== participant.id && !comments.some(comment => comment.user.type === 'User' && comment.user.id === participant.id)) {
    throw new Error('The assignee must be the issue author or have commented on this issue.');
  }
  const contract = profiles.find(record => record.profile.contributions.some(task => task.issue === issue.number));
  if (contract && contract.profile.github_id !== participant.id) throw new Error('Recorded task ownership cannot be reassigned.');
  if (issue.assignees.some(assignee => assignee.id !== participant.id)) throw new Error('The task already has a different assignee.');
}

export function assignmentSuperseded(events, at) {
  return events.some(event => ['assigned', 'unassigned'].includes(event.event) && Date.parse(event.created_at) >= Date.parse(at));
}

export async function planAssignment(client, issue, profiles, login, proof) {
  if (issue.state !== 'open') return null;
  const participant = await client.request(`users/${encodeURIComponent(login)}`);
  const comments = await client.list(`${client.root}/issues/${issue.number}/comments`);
  const events = await client.list(`${client.root}/issues/${issue.number}/events`);
  if (assignmentSuperseded(events, proof.at)) return null;
  validateAssignment(issue, participant, profiles, comments);
  if (issue.assignees.length === 1 && issue.assignees[0].id === participant.id) return null;
  return {mode: 'native', action: 'assign', issue: issue.number,
    assignee: {id: participant.id, login: participant.login}, source: proof.source};
}
