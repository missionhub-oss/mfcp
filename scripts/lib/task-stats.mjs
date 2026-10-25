// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {z} from 'zod';
import {DEFAULT_REPOSITORY} from './github.mjs';

const issueSchema = z.object({
  number: z.number().int().positive(),
  state: z.enum(['open', 'closed']),
  state_reason: z.string().nullable(),
  assignees: z.array(z.object({id: z.number().int().positive()})),
  labels: z.array(z.object({name: z.string()})),
  pull_request: z.object({}).optional(),
});

export async function loadTaskIssues({token = process.env.GITHUB_TOKEN} = {}) {
  const headers = {Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'};
  if (token) headers.Authorization = `Bearer ${token}`;
  const issues = [];
  for (let page = 1; ; page++) {
    const url = new URL(`https://api.github.com/repos/${DEFAULT_REPOSITORY}/issues`);
    url.search = new URLSearchParams({state: 'all', labels: 'kind/task', sort: 'created', direction: 'asc', per_page: '100', page: String(page)});
    const response = await fetch(url, {headers, signal: AbortSignal.timeout(30_000)});
    if (!response.ok) throw new Error(`Cannot load task statistics: GitHub returned HTTP ${response.status}.`);
    const entries = z.array(issueSchema).parse(await response.json());
    issues.push(...entries);
    if (entries.length < 100) return issues;
  }
}

export function taskStats(issues) {
  const tasks = new Map();
  for (const issue of z.array(issueSchema).parse(issues)) {
    if (!issue.pull_request && issue.labels.some(label => label.name === 'kind/task')) tasks.set(issue.number, issue);
  }
  return {
    tasks: tasks.size,
    inProgressTasks: [...tasks.values()].filter(issue => issue.state === 'open' && issue.assignees.length > 0).length,
    completedTasks: [...tasks.values()].filter(issue => issue.state === 'closed' && issue.state_reason === 'completed').length,
  };
}
