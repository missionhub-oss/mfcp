// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import { execFileSync } from 'node:child_process';
import { REPOSITORY_ID } from './github.mjs';
import { isMentor, requireMentor, withMentorSignoffs } from './mentors.mjs';
import { participantPath, normalizeProfile, validateProfile, rulesSchema, governanceSchema,
  totals, eligible, activeSettlement, digest, equal, taskMentors } from './profile.mjs';
import { parseCommand, taskSettings } from './commands.mjs';
import { planAssignment } from './assignments.mjs';
import {updateMentorSection, readMentorCommands, assertMentorSection, mergeMentorConfigurations} from './mentor-section.mjs';
import {programYearAt, taskYear} from './program-year.mjs';
export { parseCommand } from './commands.mjs';

const eventKey = source => `${source.kind}-${source.comment ?? source.pr ?? source.event}`;
const requireRole = (ids, actor, message) => {if (!ids.includes(actor)) throw new Error(message);};
const recordedTask = (profiles, issue) => profiles.flatMap(record => record.profile.contributions).find(task => task.issue === issue.number);
const recordedYear = task => task ? Number(task.policy.id.split('.')[0]) : undefined;

export async function currentRules(client, ref, time, year = programYearAt(time)) {
  const entries = await client.request(`${client.root}/contents/programs/${year}/rules?ref=${ref}`);
  const versions = [];
  for (const entry of entries.filter(e => e.type === 'file' && /^v\d+\.json$/.test(e.name))) {
    const file = await client.file(entry.path, ref);
    const rules = rulesSchema.parse(file.value);
    if (rules.year !== year || rules.id !== `${year}.${entry.name.slice(0, -5)}`) throw new Error('Rule filename and identity disagree.');
    if (Date.parse(rules.effective_at) <= Date.parse(time)) versions.push({rules, sha: file.sha});
  }
  versions.sort((a, b) => Date.parse(b.rules.effective_at) - Date.parse(a.rules.effective_at));
  if (!versions.length) throw new Error(`No effective rules for ${year}.`);
  if (versions[1]?.rules.effective_at === versions[0].rules.effective_at) throw new Error('Ambiguous effective rule versions.');
  const governance = governanceSchema.parse((await client.file(`programs/${year}/governance.json`, ref)).value);
  return {...versions[0], governance};
}

export async function readProfiles(client, ref) {
  const tree = await client.request(`${client.root}/git/trees/${ref}?recursive=1`);
  if (tree.truncated) throw new Error('Incomplete repository tree.');
  const profiles = [];
  for (const file of tree.tree.filter(e => /^participants\/[a-z0-9-]+\.json$/.test(e.path))) {
    if (file.mode !== '100644') throw new Error('Participant records must be regular files.');
    const value = await client.file(file.path, ref);
    profiles.push({path: file.path, profile: normalizeProfile(value.value, file.path)});
  }
  if (new Set(profiles.map(p => p.profile.github_id)).size !== profiles.length) throw new Error('Duplicate participant identities.');
  return profiles;
}

async function readComment(client, source, slug) {
  const comment = await client.request(`${client.root}/issues/comments/${source.comment}`);
  if (comment.issue_url !== `https://api.github.com/${client.root}/issues/${source.issue}`) throw new Error('Comment does not belong to the source issue.');
  const command = parseCommand(comment.body, slug);
  if (!command || comment.user.type !== 'User') throw new Error('Expected a human-authored command.');
  await requireMentor(comment.user);
  if (comment.created_at !== comment.updated_at) throw new Error('Commands are immutable; post a new comment instead of editing.');
  return {command, proof: {source, actor: comment.user.id, at: comment.created_at,
    digest: digest(comment.body), details: JSON.stringify(command.data)}, comment};
}

export async function validateMentorConfiguration(client, issue, profiles, read, ref) {
  if (issue.pull_request || !issue.labels.some(label => label.name === 'kind/task')) throw new Error('Configure a mentor on a kind/task issue.');
  taskYear(issue, {at: read.proof.at, recordedYear: recordedYear(recordedTask(profiles, issue)), required: false});
  const {governance} = await currentRules(client, ref, read.proof.at);
  requireRole(governance.maintainers, read.proof.actor, 'Only maintainers can configure tasks.');
  const name = read.command.data.mentor;
  const record = profiles.find(p => /^\d+$/.test(name)
    ? p.profile.github_id === Number(name)
    : p.profile.github_login.toLowerCase() === name.replace(/^@/, '').toLowerCase());
  if (!record) throw new Error('The specified mentor must be registered.');
  const mentor = await client.request(`users/${encodeURIComponent(record.profile.github_login)}`);
  if (mentor.id !== record.profile.github_id) throw new Error('Mentor registration no longer matches GitHub.');
  await requireMentor(mentor);
  if (issue.assignees.some(assignee => assignee.id === mentor.id)) throw new Error('The task contributor and mentor must be different people.');
  return {mentor: withMentorSignoffs(mentor, governance), proof: read.proof, commandUrl: read.comment.html_url};
}

export async function readIssueMentors(client, issue, profiles, ref, slug, {required = true} = {}) {
  const links = readMentorCommands(issue.body, {required});
  if (!links.length) return [];
  const repo = await client.metadata();
  const configurations = [];
  for (const link of links) {
    const url = new URL(link);
    const match = /^#issuecomment-([1-9][0-9]*)$/.exec(url.hash);
    if (url.origin !== 'https://github.com' || url.pathname !== `/${repo.full_name}/issues/${issue.number}` || url.search || !match) throw new Error('Mentor configuration must link to a command on this issue.');
    const read = await readComment(client, {kind: 'comment', issue: issue.number, comment: Number(match[1])}, slug);
    if (read.command.action !== 'configure') throw new Error('Expected a mentor configuration command.');
    configurations.push(await validateMentorConfiguration(client, issue, profiles, read, ref));
  }
  return mergeMentorConfigurations(configurations);
}

function assertRecordedMentors(configurations, task) {
  for (const recorded of task ? taskMentors(task) : []) {
    if (!configurations.some(configuration => configuration.mentor.id === recorded.mentor_id && equal(configuration.proof, recorded.configuration))) {
      throw new Error('Recorded mentor authorization changed or disappeared.');
    }
  }
}

export function selectTaskMentor(configurations, mentorId, at, task) {
  assertRecordedMentors(configurations, task);
  const configuration = configurations.find(record => record.mentor.id === mentorId);
  if (!configuration || Date.parse(configuration.proof.at) > Date.parse(at)) throw new Error('Stage acceptance requires a previously configured mentor.');
  return configuration;
}

export async function resolveTaskMentor(client, issue, profiles, ref, at, slug, task, mentorId) {
  const mentors = await readIssueMentors(client, issue, profiles, ref, slug);
  assertMentorSection(issue.body, mentors);
  return {...selectTaskMentor(mentors, mentorId, at, task), mentors};
}

async function evidenceComment(client, url, action, candidate, level, governance, ref, slug) {
  const parsed = new URL(url);
  const repo = await client.metadata();
  const match = /^\/([^/]+)\/([^/]+)\/issues\/([1-9][0-9]*)$/.exec(parsed.pathname);
  const commentMatch = /^#issuecomment-([1-9][0-9]*)$/.exec(parsed.hash);
  if (parsed.origin !== 'https://github.com' || !match || `${match[1]}/${match[2]}` !== repo.full_name || !commentMatch) {
    throw new Error('Approval must link to an issue comment in this repository.');
  }
  const data = await readComment(client, {kind: 'comment', issue: Number(match[3]), comment: Number(commentMatch[1])}, slug);
  if (data.command.action !== action || data.command.data.participant.toLowerCase() !== candidate.github_login.toLowerCase() ||
      data.command.data.level !== level || data.proof.actor === candidate.github_id) throw new Error('Approval scope or author mismatch.');
  if (action === 'interview') requireRole(governance.interviewers, data.proof.actor, 'Unauthorized interviewer.');
  if (action === 'recommend') {
    const profiles = await readProfiles(client, ref);
    if (!profiles.some(p => p.profile.github_id === data.proof.actor && p.profile.level >= 3)) throw new Error('Recommendations require a registered L3/L4 contributor.');
  }
  return data.proof;
}

export function signoffs(message) {
  const trailers = execFileSync('git', ['interpret-trailers', '--parse'], {input: message, encoding: 'utf8'});
  return trailers.split('\n').filter(line => line.toLowerCase().startsWith('signed-off-by:'))
    .map(line => line.slice(line.indexOf(':') + 1).trim().toLowerCase());
}

async function verifyUpstream(client, url, participant, mentor, rules) {
  const parsed = new URL(url);
  const match = /^\/([^/]+)\/([^/]+)\/pull\/([1-9][0-9]*)\/?$/.exec(parsed.pathname);
  if (parsed.origin !== 'https://github.com' || !match || parsed.search || parsed.hash) throw new Error('Use the canonical upstream pull request URL.');
  const repository = `${match[1]}/${match[2]}`;
  if (!rules.upstream_repositories.includes(repository)) throw new Error('Upstream repository is not allowed by the annual rules.');
  const number = Number(match[3]);
  const pr = await client.request(`repos/${repository}/pulls/${number}`);
  const upstreamRepo = await client.request(`repos/${repository}`);
  if (!pr.merged || !pr.merge_commit_sha || pr.base.ref !== upstreamRepo.default_branch ||
      pr.user.id !== participant.github_id) throw new Error('PR must be merged to upstream default branch and authored by the participant.');
  const commits = await client.list(`repos/${repository}/pulls/${number}/commits`);
  if (!commits.length || commits.length !== pr.commits) throw new Error('Incomplete upstream commit list.');
  for (const c of commits) {
    const trailers = signoffs(c.commit.message);
    const author = `${c.commit.author.name} <${c.commit.author.email}>`.toLowerCase();
    if (c.author?.id !== participant.github_id || !trailers.includes(author) ||
        !mentor.signoffs.some(s => trailers.includes(s.toLowerCase()))) {
      throw new Error('Every patch commit needs attributable author and authorized mentor DCO sign-offs.');
    }
  }
  return {repository, number, author: pr.user.id, merge_commit: pr.merge_commit_sha,
    merged_at: pr.merged_at, commits: commits.map(c => c.sha), url: pr.html_url};
}

export async function hasPendingReversal(client, participantId, slug) {
  const prs = await client.list(`${client.root}/pulls?state=open`);
  return prs.some(pr => pr.user.login === `${slug}[bot]` && pr.head.ref.startsWith(`progress/review/reopened-${participantId}-`));
}

export async function buildProposal(client, source, ref, {slug, reviewPr = null} = {}) {
  const profiles = await readProfiles(client, ref);
  let selected, proof, action, data, issue, settlementAuthor, settings, commandSource;
  if (source.kind === 'comment') {
    const read = await readComment(client, source, slug);
    ({action, data} = read.command);
    proof = read.proof;
    if (['endorse', 'interview', 'recommend'].includes(action)) {
      const candidate = profiles.find(p => p.profile.github_login.toLowerCase() === data.participant.toLowerCase());
      if (!candidate) throw new Error('The candidate must be registered.');
      const {governance} = await currentRules(client, ref, proof.at);
      await evidenceComment(client, read.comment.html_url, action, candidate.profile, data.level, governance, ref, slug);
      return {mode: 'evidence', action, participant: candidate.profile.github_login, source};
    }
    issue = await client.request(`${client.root}/issues/${source.issue}`);
    if (action === 'assign') return planAssignment(client, issue, profiles, data.assignee, proof);
    if (action === 'configure') {
      const configuration = await validateMentorConfiguration(client, issue, profiles, read, ref);
      const mentors = mergeMentorConfigurations(await readIssueMentors(client, issue, profiles, ref, slug, {required: false}), configuration);
      assertRecordedMentors(mentors, recordedTask(profiles, issue));
      return {mode: 'native', action, mentor: configuration.mentor.login, issue: issue.number,
        mentors, mentorCommands: readMentorCommands(issue.body, {required: false}),
        body: updateMentorSection(issue.body, mentors), commandDigest: proof.digest, source};
    }
    if (['stage', 'settle'].includes(action)) {
      settings = taskSettings(issue, {at: proof.at, recordedYear: recordedYear(recordedTask(profiles, issue))});
      selected = profiles.find(p => p.profile.github_id === settings.participant_id);
    } else selected = profiles.find(p => p.profile.github_login.toLowerCase() === data.participant.toLowerCase());
  } else if (source.kind === 'registration') {
    const pr = await client.request(`${client.root}/pulls/${source.pr}`);
    const repo = await client.metadata();
    if (!pr.merged || pr.base.ref !== repo.default_branch || !pr.head.repo?.fork || pr.head.repo.id === repo.id) throw new Error('Expected a merged registration from a fork.');
    const files = await client.list(`${client.root}/pulls/${source.pr}/files`);
    if (files.length !== 1 || !['added', 'modified'].includes(files[0].status) || files[0].filename !== participantPath(pr.user.login)) throw new Error('Not an initial registration PR.');
    const original = await client.request(`${client.root}/git/blobs/${files[0].sha}`);
    const content = normalizeProfile(JSON.parse(Buffer.from(original.content, 'base64').toString('utf8')), files[0].filename);
    if (content.github_id !== pr.user.id || content.level || content.experience || content.contributions.length || content.promotions.length || content.adjustments.length) throw new Error('Registration PR contains non-initial profile data.');
    selected = profiles.find(p => p.profile.github_id === pr.user.id);
    action = 'register';
    proof = {source, actor: pr.user.id, at: pr.merged_at, digest: digest({pr: pr.number, head: pr.head.sha, merge: pr.merge_commit_sha}),
      details: JSON.stringify({registration_pr: pr.html_url, merge_commit: pr.merge_commit_sha})};
  } else if (source.kind === 'completed') {
    issue = await client.request(`${client.root}/issues/${source.issue}`);
    if (issue.pull_request || issue.state !== 'closed' || issue.state_reason !== 'completed') return null;
    const events = await client.list(`${client.root}/issues/${source.issue}/events`);
    const event = events.find(e => e.id === source.event && e.event === 'closed');
    if (!event) throw new Error('Unknown completion event.');
    const comments = await client.list(`${client.root}/issues/${source.issue}/comments`);
    const contract = profiles.find(p => p.profile.contributions.some(c => c.issue === source.issue));
    if (!contract) return null;
    settings = taskSettings(issue, {at: event.created_at, recordedYear: recordedYear(recordedTask(profiles, issue))});
    if (settings.participant_id !== contract.profile.github_id) throw new Error('Issue Assignee differs from the recorded task owner.');
    await requireMentor(event.actor);
    const closingRules = await currentRules(client, ref, event.created_at);
    const candidates = comments.filter(c => {
      if (c.user.type !== 'User' || c.created_at !== c.updated_at || !closingRules.governance.maintainers.includes(c.user.id)) return false;
      try {return parseCommand(c.body, slug)?.action === 'settle';} catch {return false;}
    });
    let comment;
    for (const candidate of candidates.reverse()) {
      if (await isMentor(candidate.user)) {comment = candidate; break;}
    }
    if (!comment) throw new Error('Post settlement evidence before closing the task.');
    const read = await readComment(client, {kind: 'comment', issue: source.issue, comment: comment.id}, slug);
    commandSource = read.proof.source;
    selected = contract;
    action = 'settle';
    data = read.command.data;
    settlementAuthor = read.proof.actor;
    proof = {source, actor: event.actor.id, at: event.created_at,
      digest: digest({event: event.id, evidence: read.proof.digest}),
      details: JSON.stringify({...data, evidence_comment: comment.id})};
  } else if (source.kind === 'reopened') {
    issue = await client.request(`${client.root}/issues/${source.issue}`);
    if (issue.state !== 'open' || issue.pull_request) return null;
    const events = await client.list(`${client.root}/issues/${source.issue}/events`);
    const event = events.find(e => e.id === source.event && e.event === 'reopened');
    if (!event) throw new Error('Unknown reopen event.');
    selected = profiles.find(p => p.profile.contributions.some(c => c.issue === source.issue && activeSettlement(p.profile, c)));
    if (!selected) return null;
    action = 'revoke';
    proof = {source, actor: event.actor.id, at: event.created_at, digest: digest(event.id), details: JSON.stringify({reason: 'Task reopened; completion must be reviewed.'})};
  } else throw new Error('Unsupported source.');
  if (!selected) throw new Error('Contributor is not registered.');
  const before = selected.profile;
  const after = structuredClone(before);
  const key = eventKey(source);
  if (equal(before.last_event, source) || before.promotions.some(p => p.id === key) || before.adjustments.some(a => a.id === key) ||
      before.contributions.some(c => c.configuration.source.comment === source.comment && source.kind === 'comment' ||
        c.stages.some(s => equal(s.proof.source, source)) || c.settlements.some(s => s.id === key))) return null;
  const {rules, sha, governance} = await currentRules(client, ref, proof.at);
  const policy = {id: rules.id, sha};
  let mode = 'auto';
  let task = issue && after.contributions.find(c => c.issue === issue.number);
  if (['stage', 'settle'].includes(action)) {
    const owner = profiles.find(p => p.profile.contributions.some(c => c.issue === issue.number));
    if (owner && owner.profile.github_id !== before.github_id) throw new Error('Issue Assignee differs from the recorded task owner.');
    const mentorId = action === 'stage' ? proof.actor : task?.stages.filter(stage => stage.name === 'validated').at(-1)?.proof.actor;
    const configuration = await resolveTaskMentor(client, issue, profiles, ref, proof.at, slug, task, mentorId);
    if (configuration.mentor.id === before.github_id) throw new Error('Choose a registered, independent Mentor Team member.');
    if (!task && action === 'stage') {
      const contractRules = await currentRules(client, ref, proof.at, settings.year);
      task = {id: `task-${issue.number}`, issue: issue.number, participant_id: before.github_id,
        mentor_id: configuration.mentor.id, difficulty: settings.difficulty,
        policy: {id: contractRules.rules.id, sha: contractRules.sha}, points: contractRules.rules.points[settings.difficulty],
        configuration: configuration.proof, stages: [], settlements: []};
      after.contributions.push(task);
    }
    if (!task) throw new Error('Accept reproduction and validation before settlement.');
    task.mentors = configuration.mentors.map(record => ({mentor_id: record.mentor.id, configuration: record.proof}));
  }
  if (settings && task && (task.difficulty !== settings.difficulty || Number(task.policy.id.split('.')[0]) !== settings.year)) {
    throw new Error('Issue labels differ from the recorded task rules; restore the configured difficulty and year.');
  }
  if (issue?.pull_request) throw new Error('Use an issue for contribution commands.');
  if (['configure', 'stage', 'settle'].includes(action) && !issue.labels.some(l => l.name === 'kind/task')) throw new Error('Expected kind/task issue.');
  if (action === 'stage') {
    if (!task || !taskMentors(task).some(mentor => mentor.mentor_id === proof.actor) || proof.actor === before.github_id) throw new Error('Only an assigned independent mentor can accept a stage.');
    if (activeSettlement(after, task)) throw new Error('Task is already settled.');
    if (data.stage === 'validated' && !task.stages.some(s => s.name === 'reproduced')) throw new Error('Accept reproduction before implementation validation.');
    task.stages.push({name: data.stage, proof});
  } else if (action === 'settle') {
    requireRole(governance.maintainers, proof.actor, 'Final settlement requires a maintainer.');
    if (settlementAuthor) requireRole(governance.maintainers, settlementAuthor, 'Settlement evidence must be submitted by a maintainer.');
    if (!task || activeSettlement(after, task)) return null;
    if (issue.state !== 'closed' || issue.state_reason !== 'completed') return null;
    const latestStage = task.stages.filter(s => s.name === 'validated').at(-1);
    const lastAdjustment = after.adjustments.filter(a => a.contribution_id === task.id).at(-1);
    const reversal = lastAdjustment && await client.request(`${client.root}/pulls/${lastAdjustment.review_pr}`);
    if (!latestStage || reversal && (!reversal.merged_at || Date.parse(latestStage.proof.at) <= Date.parse(reversal.merged_at))) throw new Error('A fresh mentor validation after reversal merge is required.');
    if (Date.parse(latestStage.proof.at) > Date.parse(proof.at)) throw new Error('Settlement must follow mentor validation.');
    const mentor = governance.mentors.find(m => m.github_id === latestStage.proof.actor);
    if (!mentor || mentor.github_id === before.github_id) throw new Error('Independent mentor DCO signature metadata is required.');
    const verifiedStage = await readComment(client, latestStage.proof.source, slug);
    if (verifiedStage.proof.digest !== latestStage.proof.digest || verifiedStage.proof.actor !== mentor.github_id) throw new Error('Mentor acceptance changed or disappeared.');
    const [year, version] = task.policy.id.split('.');
    const contract = await client.file(`programs/${year}/rules/${version}.json`, ref);
    if (contract.sha !== task.policy.sha) throw new Error('Published task rules were modified.');
    const originalRules = rulesSchema.parse(contract.value);
    const prs = [];
    for (const url of data.pull_requests) prs.push(await verifyUpstream(client, url, before, mentor, originalRules));
    if (prs.some(pr => Date.parse(pr.merged_at) > Date.parse(proof.at))) throw new Error('Settlement must occur after upstream merge.');
    const used = new Set(profiles.flatMap(p => p.profile.contributions.flatMap(c => activeSettlement(p.profile, c)?.upstream.map(pr => `${pr.repository}#${pr.number}`) ?? [])));
    for (const pr of prs) {
      const id = `${pr.repository}#${pr.number}`;
      if (used.has(id)) throw new Error('Upstream PR already credited.');
      used.add(id);
    }
    task.settlements.push({id: key, proof, upstream: prs, points: task.points});
  } else if (action === 'register') {
    if (after.level >= 1) return null;
    after.promotions.push({id: key, from: 0, to: 1, policy, proof, reason: 'Identity registration PR merged.', evidence: [], review_pr: null});
    after.level = 1;
  } else if (action === 'revoke') {
    const settled = activeSettlement(after, task);
    if (!settled) return null;
    after.adjustments.push({id: key, contribution_id: task.id, settlement_id: settled.id,
      points: settled.points, proof, review_pr: reviewPr});
    mode = 'review';
  } else if (action === 'promote') {
    requireRole(governance.maintainers, proof.actor, 'Only maintainers can initiate a high-level promotion.');
    if (proof.actor === before.github_id || data.level !== before.level + 1) throw new Error('Promotion needs an independent initiator and the next level.');
    if (await hasPendingReversal(client, before.github_id, slug)) throw new Error('Resolve pending reversals first.');
    if (data.level === 3 && !eligible(before, rules.level3)) throw new Error('L3 quantitative prerequisites are incomplete.');
    const evidence = [await evidenceComment(client, data.mentor_comment, 'endorse', before, data.level, governance, ref, slug)];
    if (data.level === 3) {
      if (!data.interview_comment) throw new Error('Interview evidence is required.');
      evidence.push(await evidenceComment(client, data.interview_comment, 'interview', before, 3, governance, ref, slug));
      if (evidence[0].actor === evidence[1].actor) throw new Error('Mentor and interviewer must be different people.');
    } else {
      const recommendations = [];
      for (const url of data.recommendations) recommendations.push(await evidenceComment(client, url, 'recommend', before, 4, governance, ref, slug));
      if (new Set(recommendations.map(p => p.actor)).size < rules.level4_recommendations) throw new Error('Independent recommendations are incomplete.');
      evidence.push(...recommendations);
    }
    after.promotions.push({id: key, from: before.level, to: data.level, policy, proof,
      reason: data.summary, evidence, review_pr: reviewPr});
    after.level = data.level;
    mode = 'review';
  }
  after.experience = totals(after).experience;
  if (before.level >= 3) mode = 'review';
  if (mode === 'auto' && after.level === 1 && eligible(after, rules.level2) && !await hasPendingReversal(client, before.github_id, slug)) {
    after.promotions.push({id: `${key}-level2`, from: 1, to: 2, policy, proof,
      reason: 'Annual experience, independent tasks and merged PR thresholds met.', evidence: [], review_pr: null});
    after.level = 2;
  }
  after.last_event = source;
  after.updated_at = proof.at;
  validateProfile(after, selected.path);
  return {path: selected.path, before, after, source, commandSource, mode, action, policy, governance,
    approvals: action === 'promote' ? rules.review_approvals : 1,
    branch: `progress/${mode}/${action === 'revoke' ? 'reopened' : action}-${before.github_id}-${key}`};
}

export async function requireReviews(client, pr, proposal) {
  const latest = new Map();
  for (const review of await client.list(`${client.root}/pulls/${pr.number}/reviews`)) {
    if (['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)) latest.set(review.user.id, review);
  }
  const allowed = proposal.action === 'promote' ? proposal.governance.reviewers : proposal.governance.maintainers;
  if ([...latest.values()].some(r => allowed.includes(r.user.id) && r.state === 'CHANGES_REQUESTED')) throw new Error('Changes have been requested.');
  const approvals = [...latest.values()].filter(r => allowed.includes(r.user.id) && r.user.id !== proposal.before.github_id &&
    r.state === 'APPROVED' && r.commit_id === pr.head.sha);
  let authorized = 0;
  for (const approval of approvals) if (await isMentor(approval.user)) authorized++;
  if (authorized < proposal.approvals) throw new Error('Independent Mentor Team approvals for the current PR revision are incomplete.');
}

export async function verifyReview(client, pr) {
  const slug = process.env.MFCP_APP_SLUG;
  const repo = await client.metadata();
  if (!slug || pr.user.login !== `${slug}[bot]` || pr.head.repo?.id !== REPOSITORY_ID || pr.base.ref !== repo.default_branch) throw new Error('Unexpected progression PR origin.');
  const files = await client.list(`${client.root}/pulls/${pr.number}/files`);
  if (files.length !== 1 || !/^participants\/[a-z0-9-]+\.json$/.test(files[0].filename) || files[0].status !== 'modified') throw new Error('Progression PR must modify one existing participant.');
  const candidate = await client.file(files[0].filename, pr.head.sha);
  const proposed = validateProfile(candidate.value, files[0].filename);
  const proposal = await buildProposal(client, proposed.last_event, await client.head(), {slug, reviewPr: pr.number});
  if (!proposal || proposal.mode !== 'review' || !equal(proposal.after, proposed)) throw new Error('Proposal is stale or differs from verified evidence.');
  await requireReviews(client, pr, proposal);
  return proposal;
}
