// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import { pathToFileURL } from 'node:url';
import { createClient, DEFAULT_REPOSITORY } from './lib/github.mjs';

export const STALE_DAYS = 30;
export const STALE_MARKER = '<!-- mfcp-stale-task -->';
const DAY = 86_400_000;

export function staleTasks(issues, now = new Date()) {
  const cutoff = now.getTime() - STALE_DAYS * DAY;
  return issues.filter(issue => !issue.pull_request && issue.state === 'open' &&
    issue.type?.name === 'Task' && (issue.assignees ?? []).length === 0 &&
    Date.parse(issue.created_at) < cutoff);
}

export function staleNotice(issue, now = new Date()) {
  const created = new Date(issue.created_at).toISOString().slice(0, 10);
  const days = Math.floor((now.getTime() - Date.parse(issue.created_at)) / DAY);
  return `${STALE_MARKER}
This task was created on ${created} and has had no Assignee for ${days} days, so it was closed automatically.

Comment here if you would like it reopened, or propose a new task.`;
}

async function closeStale(client, issue, now, write) {
  const comments = await client.list(`${client.root}/issues/${issue.number}/comments`);
  if (!comments.some(comment => String(comment.body ?? '').includes(STALE_MARKER)) && write) {
    await client.request(`${client.root}/issues/${issue.number}/comments`, 'POST', {body: staleNotice(issue, now)});
  }
  if (write) await client.request(`${client.root}/issues/${issue.number}`, 'PATCH', {state: 'closed', state_reason: 'not_planned'});
  console.log(`${write ? 'closed' : 'would close'} #${issue.number} (created ${issue.created_at}, no assignee)`);
}

export async function main(argv = process.argv.slice(2), now = new Date()) {
  const write = argv.includes('--write');
  const client = createClient(process.env.GITHUB_TOKEN, process.env.GITHUB_REPOSITORY || DEFAULT_REPOSITORY);
  const issues = await client.list(`${client.root}/issues?state=open&sort=created&direction=asc`);
  const stale = staleTasks(issues, now);
  console.log(`${stale.length} stale task${stale.length === 1 ? '' : 's'} out of ${issues.length} open issues.`);
  for (const issue of stale) await closeStale(client, issue, now, write);
  return stale.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
