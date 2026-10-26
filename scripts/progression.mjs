// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import { readFile, appendFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createClient, REPOSITORY_ID } from './lib/github.mjs';
import { buildProposal, verifyReview } from './lib/progression.mjs';
import { isBotCommand } from './lib/commands.mjs';
import { replyToCommand } from './lib/command-feedback.mjs';
import { markCommandProcessing } from './lib/command-reactions.mjs';
import { digest, equal, validateProfile } from './lib/profile.mjs';
import {updateMentorSection, readMentorCommands} from './lib/mentor-section.mjs';
import {formatSignoff, validateCommitMessage} from './lib/commit-policy.mjs';
import { cleanupProgressionBranches } from './lib/branch-cleanup.mjs';

const CHECKS = ['JSON format and fields', 'validate', 'Progression integrity'];
const botLogin = () => `${process.env.MFCP_APP_SLUG}[bot]`;

export async function verifyCandidate(client, head) {
  const base = await client.head();
  const commit = await client.request(`${client.root}/git/commits/${head}`);
  validateCommitMessage(commit.message, commit.author.email, {commit: head});
  if (!commit.parents.some(p => p.sha === base)) throw new Error('Candidate must be based on current main.');
  const diff = await client.request(`${client.root}/compare/${base}...${head}`);
  if (diff.files?.length !== 1 || diff.files[0].status !== 'modified' || !/^participants\/[a-z0-9-]+\.json$/.test(diff.files[0].filename)) {
    throw new Error('Automatic updates may only modify one existing participant file.');
  }
  const path = diff.files[0].filename;
  const candidate = validateProfile((await client.file(path, head)).value, path);
  const expected = await buildProposal(client, candidate.last_event, base, {slug: process.env.MFCP_APP_SLUG});
  if (!expected || expected.mode !== 'auto' || expected.after.level > 2 ||
      expected.after.experience < expected.before.experience || !equal(candidate, expected.after)) {
    throw new Error('Candidate does not match an authorized positive update.');
  }
  return expected;
}

async function checkedCommit(client, proposal, base, parent) {
  const repoCommit = await client.request(`${client.root}/git/commits/${base}`);
  const blob = await client.request(`${client.root}/git/blobs`, 'POST', {
    content: JSON.stringify(proposal.after, null, 2) + '\n', encoding: 'utf-8',
  });
  const tree = await client.request(`${client.root}/git/trees`, 'POST', {base_tree: repoCommit.tree.sha,
    tree: [{path: proposal.path, mode: '100644', type: 'blob', sha: blob.sha}]});
  const bot = await client.request(`users/${encodeURIComponent(botLogin())}`);
  if (bot.type !== 'Bot') throw new Error('Configured application identity is not a bot.');
  const name = execFileSync('git', ['config', 'user.name'], {encoding: 'utf8'}).trim();
  const email = execFileSync('git', ['config', 'user.email'], {encoding: 'utf8'}).trim();
  if (name !== bot.login || email !== `${bot.id}+${bot.login}@users.noreply.github.com`) throw new Error('Configure the application commit identity before writing.');
  const commit = await client.request(`${client.root}/git/commits`, 'POST', {
    message: `progression: ${proposal.action} for ${proposal.after.github_login}\n\n` +
      `Record verified source and annual policy ${proposal.policy.id}.\n\n${formatSignoff(name, email)}`,
    tree: tree.sha, parents: [...new Set([base, parent].filter(Boolean))], author: {name, email}, committer: {name, email},
  });
  if (parent) await client.request(`${client.root}/git/refs/heads/${proposal.branch}`, 'PATCH', {sha: commit.sha, force: false});
  else await client.request(`${client.root}/git/refs`, 'POST', {ref: `refs/heads/${proposal.branch}`, sha: commit.sha});
  return commit.sha;
}

async function branchHead(client, branch) {
  try {return (await client.request(`${client.root}/git/ref/heads/${branch}`)).object.sha;}
  catch (error) {if (error.status === 404) return null; throw error;}
}

async function waitChecks(client, head) {
  for (let attempt = 0; attempt < 36; attempt++) {
    const data = await client.request(`${client.root}/commits/${head}/check-runs?per_page=100`);
    if (data.total_count > 100) throw new Error('Too many check runs; manual inspection required.');
    const newest = new Map();
    for (const check of [...data.check_runs].sort((a, b) => a.id - b.id)) {
      if (check.app?.id === 15368) newest.set(check.name, check);
    }
    const checks = CHECKS.map(name => newest.get(name));
    if (checks.every(c => c?.status === 'completed' && c.conclusion === 'success')) return;
    if (checks.some(c => c?.status === 'completed' && c.conclusion !== 'success')) throw new Error('Required candidate check failed.');
    await new Promise(resolve => setTimeout(resolve, 10_000));
  }
  throw new Error('Candidate checks are pending; rerun or wait for scheduled reconciliation.');
}

async function enableAutoMerge(client, pr) {
  const result = await client.request('graphql', 'POST', {
    query: 'mutation($id:ID!){enablePullRequestAutoMerge(input:{pullRequestId:$id,mergeMethod:REBASE}){pullRequest{number}}}',
    variables: {id: pr.node_id},
  });
  if (result.errors) throw new Error('Unable to enable auto-merge; check repository settings and approvals.');
}

async function executeSource(client, source, {write = false} = {}) {
  const slug = process.env.MFCP_APP_SLUG;
  if (!slug) throw new Error('MFCP_APP_SLUG is required.');
  for (let attempt = 0; attempt < 3; attempt++) {
    const base = await client.head();
    let proposal = await buildProposal(client, source, base, {slug});
    if (!proposal) return {status: 'unchanged', source};
    if (proposal.mode === 'evidence') return {status: write ? 'evidence-recorded' : 'dry-run', ...proposal};
    if (proposal.mode === 'native') {
      if (!write) return {status: 'dry-run', ...proposal};
      proposal = await buildProposal(client, source, await client.head(), {slug});
      if (!proposal) return {status: 'unchanged', source};
      if (proposal.mode === 'native' && proposal.action === 'configure') {
        const current = await client.request(`${client.root}/issues/${proposal.issue}`);
        const command = await client.request(`${client.root}/issues/comments/${source.comment}`);
        if (command.created_at !== command.updated_at || digest(command.body) !== proposal.commandDigest) throw new Error('Mentor command changed during validation.');
        if (!equal(readMentorCommands(current.body, {required: false}), proposal.mentorCommands)) continue;
        const body = updateMentorSection(current.body, proposal.mentors);
        const updated = current.body === body ? current : await client.request(`${client.root}/issues/${proposal.issue}`, 'PATCH', {body});
        if (updated.body !== body) throw new Error('GitHub did not confirm the Mentor section update.');
        return {status: 'mentor-configured', mentor: proposal.mentor, url: updated.html_url};
      }
      if (proposal.mode !== 'native' || proposal.action !== 'assign') throw new Error('Assignment command changed during validation.');
      const assigned = await client.request(`${client.root}/issues/${proposal.issue}/assignees`, 'POST', {
        assignees: [proposal.assignee.login],
      });
      if (assigned.assignees.length !== 1 || assigned.assignees[0].id !== proposal.assignee.id) {
        throw new Error('GitHub did not confirm a unique assignee; inspect the issue assignment.');
      }
      return {status: 'assigned', issue: proposal.issue, assignee: proposal.assignee.login, url: assigned.html_url};
    }
    if (!write) return {status: 'dry-run', mode: proposal.mode, path: proposal.path,
      level: proposal.after.level, experience: proposal.after.experience, source};
    const prs = await client.list(`${client.root}/pulls?state=all&head=${encodeURIComponent((await client.metadata()).owner.login + ':' + proposal.branch)}`);
    let pr = prs.find(p => p.user.login === botLogin());
    if (pr?.state === 'closed') return {status: pr.merged_at ? 'already-merged' : 'review-declined', url: pr.html_url};
    if (proposal.mode === 'review' && pr) proposal = await buildProposal(client, source, base, {slug, reviewPr: pr.number});
    const existing = await branchHead(client, proposal.branch);
    let head = existing;
    const prior = existing ? (await client.file(proposal.path, existing)).value : null;
    if (!existing || !equal(prior, proposal.after) || !(await client.request(`${client.root}/git/commits/${existing}`)).parents.some(p => p.sha === base)) {
      head = await checkedCommit(client, proposal, base, existing);
    }
    if (proposal.mode === 'review') {
      if (!pr) {
        pr = await client.request(`${client.root}/pulls`, 'POST', {base: (await client.metadata()).default_branch,
          head: proposal.branch, title: `progression: ${proposal.action} for ${proposal.after.github_login}`,
          body: `Update the contributor record using verified source ${JSON.stringify(source)} and rules ${proposal.policy.id}.\n\n` +
            `Experience: ${proposal.before.experience} → ${proposal.after.experience}. Level: L${proposal.before.level} → L${proposal.after.level}.\n\n` +
            'An authorized, independent human review of the current revision is required.'});
        proposal = await buildProposal(client, source, base, {slug, reviewPr: pr.number});
        await checkedCommit(client, proposal, base, head);
      }
      try {
        await verifyReview(client, await client.request(`${client.root}/pulls/${pr.number}`));
        await enableAutoMerge(client, pr);
        return {status: 'auto-merge-enabled', url: pr.html_url};
      } catch (error) {
        return {status: 'awaiting-review', url: pr.html_url, reason: error.message};
      }
    }
    await waitChecks(client, head);
    if (await client.head() !== base) continue;
    await verifyCandidate(client, head);
    try {
      await client.request(`${client.root}/git/refs/heads/${(await client.metadata()).default_branch}`, 'PATCH', {sha: head, force: false});
    } catch (error) {
      if ([409, 422].includes(error.status) && await client.head() !== base) continue;
      throw error;
    }
    const confirmed = await client.file(proposal.path, await client.head());
    if (!equal(confirmed.value.last_event, source) && !equal(confirmed.value, proposal.after)) {
      throw new Error('A concurrent update followed publication; inspect history before retrying.');
    }
    return {status: 'published', action: proposal.action, participant: proposal.after.github_login,
      commit: head, path: proposal.path, commandSource: proposal.commandSource};
  }
  throw new Error('Main changed repeatedly; reconciliation will retry from fresh state.');
}

export async function processSource(client, source, {write = false} = {}) {
  let result, failure;
  try {
    if (write && source.kind === 'comment') await markCommandProcessing(client, source);
    result = await executeSource(client, source, {write});
  }
  catch (error) {failure = error;}
  const commandSource = source.kind === 'comment' ? source : result?.commandSource;
  if (write && commandSource) {
    try {
      const reply = await replyToCommand(client, commandSource, result, failure);
      if (result) result.reply = reply;
    } catch (error) {
      throw new Error(`Command reply could not be delivered; reconciliation will retry. ${error.message}`, {cause: failure || error});
    }
  }
  if (failure) throw failure;
  return result;
}

async function latestIssueEvent(client, number, kind) {
  const events = await client.list(`${client.root}/issues/${number}/events`);
  const event = events.filter(e => e.event === (kind === 'completed' ? 'closed' : 'reopened')).at(-1);
  return event && {kind, issue: number, event: event.id};
}

async function sourcesForEvent(client, event, name) {
  if (event.repository?.id !== REPOSITORY_ID) throw new Error('Unexpected repository.');
  if (name === 'issue_comment') {
    if (event.issue.pull_request || event.comment.user.type !== 'User' || !isBotCommand(event.comment.body, process.env.MFCP_APP_SLUG)) return [];
    return [{kind: 'comment', issue: event.issue.number, comment: event.comment.id}];
  }
  if (name === 'issues') {
    if (!['closed', 'reopened'].includes(event.action) || event.issue.pull_request) return [];
    const source = await latestIssueEvent(client, event.issue.number, event.action === 'closed' ? 'completed' : 'reopened');
    return source ? [source] : [];
  }
  if (name === 'pull_request_target' && event.action === 'closed' && event.pull_request.merged) {
    if (event.pull_request.user.type !== 'User') return [];
    const files = await client.list(`${client.root}/pulls/${event.pull_request.number}/files`);
    if (files.length !== 1 || files[0].filename !== `participants/${event.pull_request.user.login.toLowerCase()}.json`) return [];
    return [{kind: 'registration', pr: event.pull_request.number}];
  }
  return [];
}

async function reconcile(client, write) {
  const reports = [];
  const prs = await client.list(`${client.root}/pulls?state=all`);
  for (const pr of prs.filter(p => p.state === 'open' && p.user.login === botLogin() && p.head.ref.startsWith('progress/review/'))) {
    const files = await client.list(`${client.root}/pulls/${pr.number}/files`);
    if (files.length !== 1) continue;
    const profile = (await client.file(files[0].filename, pr.head.sha)).value;
    if (profile.last_event) {
      try {reports.push(await processSource(client, profile.last_event, {write}));}
      catch (error) {reports.push({status: 'pending', source: profile.last_event, reason: error.message});}
    }
  }
  for (const pr of prs.filter(p => p.merged_at && !p.user.login.endsWith('[bot]'))) {
    try {reports.push(await processSource(client, {kind: 'registration', pr: pr.number}, {write}));}
    catch (error) {if (!error.message.startsWith('Not an initial') && !error.message.startsWith('Expected a merged registration')) reports.push({status: 'pending', pr: pr.number, reason: error.message});}
  }
  const issues = await client.list(`${client.root}/issues?state=all`);
  for (const issue of issues.filter(i => !i.pull_request && i.labels.some(l => l.name === 'kind/task'))) {
    const comments = await client.list(`${client.root}/issues/${issue.number}/comments`);
    for (const comment of comments) {
      try {
        if (comment.user.type === 'User' && isBotCommand(comment.body, process.env.MFCP_APP_SLUG)) reports.push(await processSource(client,
          {kind: 'comment', issue: issue.number, comment: comment.id}, {write}));
      } catch (error) {reports.push({status: 'pending', comment: comment.id, reason: error.message});}
    }
    const kind = issue.state === 'open' ? 'reopened' : 'completed';
    const source = await latestIssueEvent(client, issue.number, kind);
    if (source) {
      try {reports.push(await processSource(client, source, {write}));}
      catch (error) {reports.push({status: 'pending', source, reason: error.message});}
    }
  }
  return reports;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const {values} = parseArgs({options: {source: {type: 'string'}, write: {type: 'boolean', default: false},
    reconcile: {type: 'boolean', default: false}, cleanup: {type: 'boolean', default: false},
    verify: {type: 'string'}, 'verify-pr': {type: 'string'}}});
  const client = createClient(process.env.GITHUB_TOKEN, process.env.GITHUB_REPOSITORY);
  let result;
  if (values.cleanup) {
    result = await cleanupProgressionBranches(client, {write: values.write});
  } else if (values.verify) {
    await verifyCandidate(client, values.verify);
    result = {status: 'verified', commit: values.verify};
  } else if (values['verify-pr']) {
    const {verifyIntegrity} = await import('./lib/integrity.mjs');
    result = await verifyIntegrity(client, Number(values['verify-pr']));
  } else if (values.reconcile || ['schedule', 'workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME)) {
    result = await reconcile(client, values.write);
  } else {
    const sources = values.source ? [JSON.parse(values.source)] : await sourcesForEvent(client,
      JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8')), process.env.GITHUB_EVENT_NAME);
    result = [];
    for (const source of sources) result.push(await processSource(client, source, {write: values.write}));
  }
  if (values.write && !values.cleanup) {
    result = {events: result, cleanup: await cleanupProgressionBranches(client, {write: true})};
  }
  console.log(JSON.stringify(result, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,
    `## MFCP progression\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n`);
}
