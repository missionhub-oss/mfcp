// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import { validatePullRequest, validatePullRequestJson } from '../membership.mjs';
import { verifyReview } from './progression.mjs';

export async function verifyIntegrity(client, number) {
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
    const protectedPaths = /^(?:\.github\/workflows\/|scripts\/|programs\/\d{4}\/(?:rules\/|governance\.json)|package(?:-lock)?\.json$)/;
    if (files.some(file => protectedPaths.test(file.filename) || protectedPaths.test(file.previous_filename ?? ''))) {
      const access = await client.request(`${client.root}/collaborators/${encodeURIComponent(pr.user.login)}/permission`);
      if (!['admin', 'maintain'].includes(access.permission)) {
        const reviews = await client.list(`${client.root}/pulls/${number}/reviews`);
        const latest = new Map();
        for (const review of reviews) if (['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)) latest.set(review.user.id, review);
        let authorized = false;
        for (const review of latest.values()) {
          if (review.user.id === pr.user.id || review.state !== 'APPROVED' || review.commit_id !== pr.head.sha) continue;
          const reviewer = await client.request(`${client.root}/collaborators/${encodeURIComponent(review.user.login)}/permission`);
          if (['admin', 'maintain'].includes(reviewer.permission)) authorized = true;
        }
        if (!authorized) throw new Error('Automation and policy changes require a maintainer approval of this revision.');
      }
    }
    await validatePullRequestJson(client, number);
    await validatePullRequest(client, number);
  }
  return {status: 'verified', pr: number};
}
