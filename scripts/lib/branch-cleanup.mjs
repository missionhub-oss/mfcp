// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import { REPOSITORY_ID } from './github.mjs';

export async function cleanupProgressionBranches(client, {write = false} = {}) {
  const slug = process.env.MFCP_APP_SLUG;
  if (!/^[a-z0-9-]+$/.test(slug ?? '')) throw new Error('A valid App slug is required.');
  const bot = await client.request(`users/${encodeURIComponent(`${slug}[bot]`)}`);
  if (bot.type !== 'Bot') throw new Error('Configured identity must be a bot.');
  const branches = await client.list(`${client.root}/branches`);
  const prs = await client.list(`${client.root}/pulls?state=all`);
  const repo = await client.metadata();
  const main = await client.head();
  const reports = [];
  for (const branch of branches) {
    if (branch.protected || !/^progress\/(auto|review)\/[a-z]+-\d+-(comment|registration|completed|reopened)-\d+$/.test(branch.name)) continue;
    const head = branch.commit.sha;
    const related = prs.filter(pr => pr.head.repo?.id === REPOSITORY_ID && pr.head.ref === branch.name);
    if (related.some(pr => pr.state === 'open')) continue;
    const commit = await client.request(`${client.root}/commits/${head}`);
    if (commit.author?.id !== bot.id || commit.committer?.id !== bot.id) continue;
    const comparison = await client.request(`${client.root}/compare/${head}...${main}`);
    const contained = comparison.merge_base_commit.sha === head;
    const mergedReview = branch.name.startsWith('progress/review/') && related.some(pr =>
      pr.merged_at && pr.user.id === bot.id && pr.head.sha === head &&
      pr.base.ref === repo.default_branch);
    if (!contained && !mergedReview) continue;
    const refPath = `${client.root}/git/refs/heads/${branch.name}`;
    if (!write) {
      reports.push({branch: branch.name, head, status: 'ready-to-delete'});
      continue;
    }
    try {
      const current = await client.request(`${client.root}/git/ref/heads/${branch.name}`);
      if (current.object.sha !== head) {
        reports.push({branch: branch.name, status: 'changed-during-cleanup'});
        continue;
      }
      await client.request(refPath, 'DELETE');
      reports.push({branch: branch.name, head, status: 'deleted'});
    } catch (error) {
      if (error.status === 404) reports.push({branch: branch.name, status: 'already-deleted'});
      else reports.push({branch: branch.name, status: 'retry-needed', reason: error.message});
    }
  }
  return reports;
}
