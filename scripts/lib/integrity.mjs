// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import { validatePullRequest, validatePullRequestJson } from '../membership.mjs';
import { verifyReview } from './progression.mjs';
import {validatePullRequestCommits} from './commit-policy.mjs';

export async function verifyPullRequestAuthority(client, pr, files) {
  const removals = files.length > 0 && files.every(file => file.status === 'removed' && /^participants\/[a-z0-9-]+\.json$/.test(file.filename));
  const protectedPaths = /^(?:\.github\/(?:workflows|actions)\/|scripts\/|site\/|programs\/\d{4}\/(?:rules\/|governance\.json)|package(?:-lock)?\.json$)/;
  if (!removals && !files.some(file => protectedPaths.test(file.filename) || protectedPaths.test(file.previous_filename ?? ''))) return;
  const access = await client.request(`${client.root}/collaborators/${encodeURIComponent(pr.user.login)}/permission`);
  if (removals && !['admin', 'maintain', 'write'].includes(access.permission)) throw new Error('Registration removal requires a repository maintainer.');
  if (removals || ['admin', 'maintain'].includes(access.permission)) return;
  const reviews = await client.list(`${client.root}/pulls/${pr.number}/reviews`);
  const latest = new Map();
  for (const review of reviews) if (['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)) latest.set(review.user.id, review);
  for (const review of latest.values()) {
    if (review.user.id === pr.user.id || review.state !== 'APPROVED' || review.commit_id !== pr.head.sha) continue;
    const reviewer = await client.request(`${client.root}/collaborators/${encodeURIComponent(review.user.login)}/permission`);
    if (['admin', 'maintain'].includes(reviewer.permission)) return;
  }
  throw new Error('Automation and policy changes require a maintainer approval of this revision.');
}

export async function verifyIntegrity(client, number) {
  await validatePullRequestCommits(client, number);
  const pr = await client.request(`${client.root}/pulls/${number}`);
  if (pr.user.login === `${process.env.MFCP_APP_SLUG}[bot]`) {
    await verifyReview(client, pr);
  } else {
    const files = await client.list(`${client.root}/pulls/${number}/files`);
    if (files.length !== pr.changed_files) throw new Error('Incomplete PR file list.');
    for (const file of files) {
      if (/^programs\/\d{4}\/rules\/v\d+\.json$/.test(file.filename) && file.status !== 'added' ||
          /^programs\/\d{4}\/rules\/v\d+\.json$/.test(file.previous_filename ?? '')) {
        throw new Error('Published rule versions are immutable; add a new version.');
      }
    }
    await verifyPullRequestAuthority(client, pr, files);
    await validatePullRequestJson(client, number);
    await validatePullRequest(client, number);
  }
  return {status: 'verified', pr: number};
}
