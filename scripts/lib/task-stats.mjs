// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {z} from 'zod';
import {DEFAULT_REPOSITORY} from './github.mjs';
import {isTaskIssue, TASK_ISSUE_TYPE} from './issue-types.mjs';

const userSchema = z.object({
  id: z.number().int().positive(),
  login: z.string().optional(),
  avatar_url: z.string().optional(),
  html_url: z.string().optional(),
  type: z.string().optional(),
});

const labelSchema = z.union([
  z.string(),
  z.object({
    name: z.string(),
    color: z.string().optional(),
  }),
]);

export const issueSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().optional(),
  body: z.string().nullish(),
  html_url: z.string().optional(),
  url: z.string().optional(),
  state: z.enum(['open', 'closed']),
  state_reason: z.string().nullable(),
  assignees: z.array(userSchema),
  labels: z.array(labelSchema).optional(),
  user: userSchema.nullish(),
  comments: z.number().int().nonnegative().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  closed_at: z.string().nullish(),
  type: z.object({name: z.string()}).nullish(),
  pull_request: z.object({}).optional(),
});

const repoStatsSchema = z.object({
  stargazers_count: z.number().int().nonnegative(),
});

async function fetchGitHubJson(url, headers) {
  let response;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      response = await fetch(url, {headers, signal: AbortSignal.timeout(30_000)});
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise(resolve => setTimeout(resolve, 400 * (2 ** attempt)));
      continue;
    }
    if ([500, 502, 503, 504].includes(response.status) && attempt < 3) {
      await response.arrayBuffer().catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 400 * (2 ** attempt)));
      continue;
    }
    break;
  }
  return response;
}

export async function loadRepositoryStats({token = process.env.GITHUB_TOKEN} = {}) {
  const headers = {Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'};
  if (token) headers.Authorization = `Bearer ${token}`;
  const url = new URL(`https://api.github.com/repos/${DEFAULT_REPOSITORY}`);
  const response = await fetchGitHubJson(url, headers);
  if (!response.ok) throw new Error(`Cannot load repository metadata: GitHub returned HTTP ${response.status}.`);
  const data = repoStatsSchema.parse(await response.json());
  return {stars: data.stargazers_count};
}

export async function loadTaskIssues({token = process.env.GITHUB_TOKEN} = {}) {
  const headers = {Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'};
  if (token) headers.Authorization = `Bearer ${token}`;
  const issues = [];
  for (let page = 1; ; page++) {
    const url = new URL(`https://api.github.com/repos/${DEFAULT_REPOSITORY}/issues`);
    url.search = new URLSearchParams({state: 'all', type: TASK_ISSUE_TYPE, sort: 'created', direction: 'asc', per_page: '100', page: String(page)});
    const response = await fetchGitHubJson(url, headers);
    if (!response.ok) throw new Error(`Cannot load task statistics: GitHub returned HTTP ${response.status}.`);
    const entries = z.array(issueSchema).parse(await response.json());
    issues.push(...entries);
    if (entries.length < 100) return issues;
  }
}

export function taskStats(issues) {
  const tasks = new Map();
  for (const issue of z.array(issueSchema).parse(issues)) {
    if (isTaskIssue(issue)) tasks.set(issue.number, issue);
  }
  return {
    tasks: tasks.size,
    inProgressTasks: [...tasks.values()].filter(issue => issue.state === 'open' && issue.assignees.length > 0).length,
    completedTasks: [...tasks.values()].filter(issue => issue.state === 'closed' && issue.state_reason === 'completed').length,
  };
}
