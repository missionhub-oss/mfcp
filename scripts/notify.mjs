// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import { parseArgs } from 'node:util';
import { createAppAuth } from '@octokit/auth-app';
import { createClient, DEFAULT_REPOSITORY, REPOSITORY_ID } from './lib/github.mjs';
import { readProfiles } from './lib/progression.mjs';
import { deliverNotifications } from './lib/notifications.mjs';

const {values} = parseArgs({options: {write: {type: 'boolean', default: false}}});
const appId = Number(process.env.MFCP_APP_ID);
const slug = process.env.MFCP_APP_SLUG;
const repository = process.env.GITHUB_REPOSITORY || DEFAULT_REPOSITORY;
let token = process.env.GITHUB_TOKEN;
let auth;
let installationId;
if (values.write) {
  if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('Send notifications through the serialized Notifications workflow.');
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid repository name.');
  auth = createAppAuth({appId, privateKey: process.env.MFCP_APP_PRIVATE_KEY});
  const appToken = await auth({type: 'app'});
  const response = await fetch(`https://api.github.com/repos/${repository}/installation`, {
    headers: {Authorization: `Bearer ${appToken.token}`, Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'}, signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Installation lookup failed: HTTP ${response.status}`);
  const installation = await response.json();
  if (installation.app_id !== appId || installation.app_slug !== slug || installation.suspended_at) {
    throw new Error('Unexpected or suspended GitHub App installation.');
  }
  installationId = installation.id;
  ({token} = await auth({type: 'installation', installationId, repositoryIds: [REPOSITORY_ID],
    permissions: {contents: 'read', issues: 'write', pull_requests: 'write'}}));
}
const client = createClient(token, repository);
try {
  const ref = await client.head();
  const profiles = await readProfiles(client, ref);
  const results = await deliverNotifications(client, profiles, {appId, slug, write: values.write});
  console.log(JSON.stringify({commit: ref, contributors: profiles.length, notifications: results}, null, 2));
  if (results.some(result => result.status === 'failed')) process.exitCode = 1;
} finally {
  if (auth && installationId) await client.request('installation/token', 'DELETE');
}
