// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {z} from 'zod';
import {digest} from './profile.mjs';
import {verifyPullRequestAuthority} from './integrity.mjs';
import {formatCheckFailure} from './check-report.mjs';
import {isRateLimited} from './processing-state.mjs';

export const prCheckStateSchema = z.strictObject({
  version: z.literal(1).default(1),
  prs: z.record(z.string(), z.strictObject({
    fingerprint: z.string(), updated_at: z.iso.datetime(),
    checks: z.record(z.string(), z.number().int().positive()),
  })).default({}),
});

export const validationFingerprint = (pr, trustedRef) => digest({
  head: pr.head.sha, base: pr.base.sha, target: pr.base.ref, title: pr.title,
  author: {id: pr.user.id, login: pr.user.login, type: pr.user.type}, trustedRef,
});

export function reusableCheck(pr, trustedRef, record, check) {
  return Number.isSafeInteger(pr.changed_files) && pr.changed_files >= 0 &&
    pr.user.type === 'User' && record?.updated_at === pr.updated_at &&
    record.fingerprint === validationFingerprint(pr, trustedRef) &&
    check?.app?.id === 15368 && check.head_sha === pr.head.sha &&
    check.status === 'completed' && check.conclusion === 'success' &&
    record.checks[check.name] === check.id;
}

async function latestChecks(client, sha) {
  const latest = new Map();
  for (let page = 1; ; page++) {
    const data = await client.request(`${client.root}/commits/${sha}/check-runs?filter=latest&per_page=100&page=${page}`);
    for (const check of data.check_runs) {
      if (check.app?.id === 15368 && (!latest.has(check.name) || latest.get(check.name).id < check.id)) latest.set(check.name, check);
    }
    if (data.check_runs.length < 100) return latest;
  }
}

export async function refreshPullRequestChecks(client, checks, {state = prCheckStateSchema.parse({}),
  write = false, checkpoint = async () => {}} = {}) {
  const reports = [];
  const repo = await client.metadata();
  const trustedRef = await client.head();
  const prs = await client.list(`${client.root}/pulls?state=open&sort=updated&direction=desc`);
  for (const listed of prs) {
    if (listed.base.ref !== repo.default_branch) continue;
    const pr = await client.request(`${client.root}/pulls/${listed.number}`);
    if (pr.state !== 'open' || pr.base.ref !== repo.default_branch || pr.head.sha !== listed.head.sha) continue;
    const fingerprint = validationFingerprint(pr, trustedRef);
    const previous = state.prs[pr.number];
    const existing = await latestChecks(client, pr.head.sha);
    const entry = previous?.fingerprint === fingerprint && previous.updated_at === pr.updated_at
      ? previous : {fingerprint, updated_at: pr.updated_at, checks: {}};
    state.prs[pr.number] = entry;
    let authorityError;
    if (checks.some(([name]) => reusableCheck(pr, trustedRef, previous, existing.get(name)))) {
      try {
        const files = await client.list(`${client.root}/pulls/${pr.number}/files`);
        if (files.length !== pr.changed_files) throw new Error('Incomplete PR file list.');
        await verifyPullRequestAuthority(client, pr, files);
      } catch (error) {if (isRateLimited(error)) throw error; authorityError = error;}
    }
    for (const [name, verify] of checks) {
      if (!authorityError && reusableCheck(pr, trustedRef, previous, existing.get(name))) {
        reports.push({pr: pr.number, check: name, conclusion: 'success', reused: true});
        continue;
      }
      const current = await client.request(`${client.root}/pulls/${pr.number}`);
      if (current.state !== 'open' || current.updated_at !== pr.updated_at ||
          validationFingerprint(current, trustedRef) !== fingerprint) break;
      const check = write ? await client.request(`${client.root}/check-runs`, 'POST', {
        name, head_sha: pr.head.sha, status: 'in_progress', started_at: new Date().toISOString(),
        external_id: `mfcp-validation:${fingerprint}`,
      }) : null;
      let conclusion = 'success', summary, limited, childRequests = 0;
      try {
        if (authorityError && name === 'Progression integrity') throw authorityError;
        const result = await verify(client, pr.number);
        childRequests = result?.api_requests ?? 0;
        summary = typeof result === 'string' ? result : JSON.stringify(result);
        const latest = await client.request(`${client.root}/pulls/${pr.number}`);
        if (latest.state !== 'open' || latest.updated_at !== pr.updated_at ||
            validationFingerprint(latest, trustedRef) !== fingerprint || await client.head() !== trustedRef) {
          conclusion = 'cancelled';
          summary = 'Validation inputs changed; retry the current revision.';
        }
      } catch (error) {
        conclusion = 'failure';
        limited = isRateLimited(error) && error;
        summary = formatCheckFailure(error, client.repository);
      }
      if (check) await client.request(`${client.root}/check-runs/${check.id}`, 'PATCH', {
        status: 'completed', conclusion, completed_at: new Date().toISOString(), output: {title: name, summary},
      });
      const confirmed = check || existing.get(name);
      if (conclusion === 'success' && confirmed?.app?.id === 15368 &&
          (write || confirmed.status === 'completed' && confirmed.conclusion === 'success')) entry.checks[name] = confirmed.id;
      else delete entry.checks[name];
      await checkpoint();
      reports.push({pr: pr.number, check: name, conclusion, reused: false, api_requests: childRequests});
      if (limited) throw limited;
      if (conclusion === 'cancelled') break;
    }
  }
  const open = new Set(prs.map(pr => String(pr.number)));
  for (const number of Object.keys(state.prs)) if (!open.has(number)) delete state.prs[number];
  await checkpoint();
  return reports;
}
