// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import { pathToFileURL } from 'node:url';
import { createClient, DEFAULT_REPOSITORY } from './lib/github.mjs';

export const LEGACY_REPOSITORY = 'processmission-intern/mission-forge';
const LEGACY_PREFIX = `https://github.com/${LEGACY_REPOSITORY}/`;
const COMMAND_LINK = /(<!--\s*mfcp-mentor-command:\s*")([^"]+)(")/g;

export function relinkMentorCommands(body, repository = DEFAULT_REPOSITORY) {
  if (typeof body !== 'string' || !body.includes(LEGACY_PREFIX)) return body;
  const current = `https://github.com/${repository}/`;
  return body.replace(COMMAND_LINK, (match, open, url, close) =>
    url.startsWith(LEGACY_PREFIX) ? `${open}${current}${url.slice(LEGACY_PREFIX.length)}${close}` : match);
}

export async function main(argv = process.argv.slice(2)) {
  const write = argv.includes('--write');
  const client = createClient(process.env.GITHUB_TOKEN, process.env.GITHUB_REPOSITORY || DEFAULT_REPOSITORY);
  const repository = (await client.metadata()).full_name;
  const issues = await client.list(`${client.root}/issues?state=all&sort=created&direction=asc`);
  let changed = 0;
  for (const issue of issues) {
    if (issue.pull_request) continue;
    const body = relinkMentorCommands(issue.body, repository);
    if (body === issue.body) continue;
    changed++;
    console.log(`${write ? 'updated' : 'would update'} #${issue.number} ${issue.html_url}`);
    if (write) await client.request(`${client.root}/issues/${issue.number}`, 'PATCH', {body});
  }
  console.log(`${changed} issue${changed === 1 ? '' : 's'} with mentor command links from ${LEGACY_REPOSITORY}.`);
  return changed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
