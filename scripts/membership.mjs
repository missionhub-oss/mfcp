// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createClient as githubClient, REPOSITORY_ID, DEFAULT_REPOSITORY } from './lib/github.mjs';
import { normalizeProfile, initialProfile, assertIdentityOnly, equal, validateProfile, digest } from './lib/profile.mjs';
import { isTrustedBotComment } from './lib/bot-identity.mjs';

export function participantPath(login) {
  if (typeof login !== 'string' || !/^[a-z0-9-]{1,39}$/i.test(login)) {
    throw new Error('Invalid GitHub username.');
  }
  return `participants/${login.toLowerCase()}.json`;
}

export function validateRegistrationFormat(record, filename) {
  if (record && typeof record === 'object' && 'schema_version' in record) {
    return validateProfile(record, filename);
  }
  if (!record || Array.isArray(record) || typeof record !== 'object' ||
      Object.keys(record).sort().join(',') !== 'github_id,github_login') {
    throw new Error(`${filename}: registration must contain only github_id and github_login.`);
  }
  if (!Number.isSafeInteger(record.github_id) || record.github_id <= 0) {
    throw new Error(`${filename}: github_id must be a positive safe integer.`);
  }
  if (typeof record.github_login !== 'string' ||
      !/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/i.test(record.github_login)) {
    throw new Error(`${filename}: github_login must be a valid GitHub username.`);
  }
  if (filename !== participantPath(record.github_login)) {
    throw new Error(`${filename}: filename must use the lowercase github_login.`);
  }
  return record;
}

export function parseRegistration(content, filename) {
  let record;
  try {
    record = JSON.parse(content);
  } catch {
    throw new Error(`${filename}: invalid JSON syntax.`);
  }
  return validateRegistrationFormat(record, filename);
}

export function validateRegistration(record, author, filename) {
  validateRegistrationFormat(record, filename);
  if (record.github_id !== author.id ||
      record.github_login.toLowerCase() !== author.login.toLowerCase() ||
      filename !== participantPath(author.login) || author.type !== 'User') {
    throw new Error('Registration must match the PR author and lowercase username filename.');
  }
  return record;
}

export function createClient(token, repository = DEFAULT_REPOSITORY) {
  const client = githubClient(token, repository);
  const {request, root} = client;
  async function registered(user) {
    if (!Number.isSafeInteger(user.id) || user.id <= 0) throw new Error('Invalid user ID.');
    if (user.type !== 'User') return false;
    let file;
    try {
      file = await request(`${root}/contents/${participantPath(user.login)}`);
    } catch (error) {
      if (error.status === 404) return false;
      throw error;
    }
    if (file.type !== 'file' || file.encoding !== 'base64') throw new Error('Invalid registration file.');
    const record = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
    validateRegistrationFormat(record, participantPath(user.login));
    return record.github_id === user.id && record.github_login.toLowerCase() === user.login.toLowerCase();
  }
  return {...client, registered};
}

async function registrationBlob(client, file) {
  const blob = await client.request(`${client.root}/git/blobs/${file.sha}`);
  if (blob.encoding !== 'base64' || blob.size > 2_000_000) {
    throw new Error(`${file.filename}: participant JSON exceeds the supported size.`);
  }
  return parseRegistration(Buffer.from(blob.content, 'base64').toString('utf8'), file.filename);
}

export async function validatePullRequestJson(client, number) {
  const pr = await client.request(`${client.root}/pulls/${number}`);
  const files = await client.list(`${client.root}/pulls/${number}/files`);
  if (files.length !== pr.changed_files) throw new Error('Incomplete PR file list.');
  const registrations = files.filter(file => file.filename.startsWith('participants/') &&
    file.filename !== 'participants/README.md' && file.status !== 'removed');
  for (const file of registrations) {
    await registrationBlob(client, file);
  }
  return `JSON syntax, fields and filenames verified for ${registrations.length} participant files.`;
}

const RECOGNITION_MARKER = /recognition decision/i;
const APPENDED_FIELDS = ['recognitions', 'promotions'];

export function recognitionOnlyChange(before, after) {
  if (before.github_id !== after.github_id || before.github_login !== after.github_login ||
      before.schema_version !== after.schema_version) return false;
  for (const field of ['contributions', 'adjustments', 'last_event']) {
    if (!equal(before[field], after[field])) return false;
  }
  for (const field of APPENDED_FIELDS) {
    if (before[field].length > after[field].length) return false;
    if (!before[field].every((item, index) => equal(item, after[field][index]))) return false;
  }
  const added = after.recognitions.length - before.recognitions.length +
    after.promotions.length - before.promotions.length;
  if (!added) return false;
  return after.recognitions.slice(before.recognitions.length).every(record => record.proof.source.kind === 'comment') &&
    after.promotions.slice(before.promotions.length).every(record => record.proof.source.kind === 'comment');
}

async function verifyRecognitionProof(client, proof, maintainers) {
  const comment = await client.request(`${client.root}/issues/comments/${proof.source.comment}`);
  if (comment.user?.type !== 'User' || comment.user.id !== proof.actor) throw new Error('Recognition evidence author mismatch.');
  if (comment.created_at !== proof.at) throw new Error('Recognition evidence timestamp mismatch.');
  if (!maintainers.includes(proof.actor)) throw new Error('Recognition evidence must come from an annual maintainer.');
  if (digest(comment.body) !== proof.digest) throw new Error('Recognition evidence changed after it was recorded.');
  if (!RECOGNITION_MARKER.test(comment.body)) throw new Error('Recognition evidence must state a recognition decision.');
}

async function recognitionUpdate(client, pr, registrations, files) {
  if (files.length !== registrations.length) return null;
  if (!registrations.every(file => file.status === 'modified' && /^participants\/[a-z0-9-]+\.json$/.test(file.filename))) return null;
  const governance = JSON.parse((await client.file('programs/2026/governance.json', pr.base.sha)).value);
  let proofs = [];
  for (const file of registrations) {
    const before = normalizeProfile(JSON.parse((await client.file(file.filename, pr.base.sha)).value), file.filename);
    const after = normalizeProfile(await registrationBlob(client, file), file.filename);
    if (!recognitionOnlyChange(before, after)) return null;
    proofs = proofs.concat(after.recognitions.slice(before.recognitions.length).map(record => record.proof),
      after.promotions.slice(before.promotions.length).map(record => record.proof));
  }
  if (!proofs.length) return null;
  for (const proof of proofs) await verifyRecognitionProof(client, proof, governance.maintainers);
  return 'Recognition updates verified.';
}

export async function validatePullRequest(client, number) {
  const pr = await client.request(`${client.root}/pulls/${number}`);
  const repo = await client.request(client.root);
  const files = await client.list(`${client.root}/pulls/${number}/files`);
  if (files.length !== pr.changed_files) throw new Error('Incomplete PR file list.');
  const registrations = files.filter(file =>
    (file.filename.startsWith('participants/') && file.filename !== 'participants/README.md') ||
    (file.previous_filename?.startsWith('participants/') && file.previous_filename !== 'participants/README.md'));
  if (!registrations.length) return 'No registration changes.';
  if (process.env.MFCP_APP_SLUG && pr.user.login === `${process.env.MFCP_APP_SLUG}[bot]`) {
    const {verifyReview} = await import('./lib/progression.mjs');
    await verifyReview(client, pr);
    return 'Progression proposal verified.';
  }
  if (files.length === registrations.length && registrations.every(file =>
    file.status === 'removed' && /^participants\/[a-z0-9-]{1,39}\.json$/.test(file.filename))) {
    const access = await client.request(`${client.root}/collaborators/${encodeURIComponent(pr.user.login)}/permission`);
    if (!['admin', 'maintain', 'write'].includes(access.permission)) {
      throw new Error('Registration removal requires a repository maintainer.');
    }
    if (pr.base.ref !== repo.default_branch) throw new Error('Removal must target the default branch.');
    return 'Maintainer registration removal; human review is required.';
  }
  const permission = await client.request(`${client.root}/collaborators/${encodeURIComponent(pr.user.login)}/permission`);
  if (['admin', 'maintain'].includes(permission.permission)) {
    const recognition = await recognitionUpdate(client, pr, registrations, files);
    if (recognition) return recognition;
  }
  if (pr.base.ref !== repo.default_branch || !pr.head.repo?.fork || pr.head.repo.full_name === repo.full_name) {
    throw new Error('Registration must come from a fork and target the default branch.');
  }
  const target = registrations.find(file => file.filename === participantPath(pr.user.login) &&
    ['added', 'modified', 'renamed'].includes(file.status));
  const removed = registrations.filter(file => file.status === 'removed');
  if (!target || files.length !== 1 + removed.length || removed.length > 1 ||
      (removed.length && target.status !== 'added')) {
    throw new Error('A registration PR must only add, update or rename its author’s username JSON file.');
  }
  const previous = target.previous_filename || removed[0]?.filename;
  if (previous) {
    if (!/^participants\/[a-z0-9-]{1,39}\.json$/.test(previous)) throw new Error('Invalid previous registration path.');
    const oldFile = await client.request(`${client.root}/contents/${previous}?ref=${pr.base.sha}`);
    if (oldFile.type !== 'file' || oldFile.encoding !== 'base64') throw new Error('Invalid previous registration.');
    const oldRecord = JSON.parse(Buffer.from(oldFile.content, 'base64').toString('utf8'));
    if (oldRecord.github_id !== pr.user.id) throw new Error('Cannot rename another participant’s registration.');
  }
  const record = await registrationBlob(client, target);
  validateRegistration(record, pr.user, target.filename);
  const user = await client.request(`users/${encodeURIComponent(record.github_login)}`);
  validateRegistration(record, user, target.filename);
  const after = normalizeProfile(record, target.filename);
  if (target.status === 'added' && !previous) {
    if (!equal(after, initialProfile({github_id: user.id, github_login: user.login}))) {
      throw new Error('New registrations must start at level 0 with empty history.');
    }
  } else {
    const old = await client.file(previous || target.filename, pr.base.sha);
    assertIdentityOnly(normalizeProfile(old.value, previous || target.filename), after);
  }
  return 'Registration identity verified. Maintainer review and merge are required.';
}

export async function moderate(client, event, eventName) {
  if (event.repository?.id !== REPOSITORY_ID) throw new Error('Unexpected event repository.');
  if (event.issue?.pull_request) return 'PR discussions remain open.';
  if (eventName === 'issues' && ['opened', 'reopened'].includes(event.action)) {
    const issue = await client.request(`${client.root}/issues/${event.issue.number}`);
    if (issue.pull_request || issue.state !== 'open') return 'No open issue to process.';
    if (await client.registered(issue.user)) return 'Registered issue author.';
    await client.request(`${client.root}/issues/${issue.number}`, 'PATCH',
      {state: 'closed', state_reason: 'not_planned'});
    return `Closed unregistered issue #${issue.number}.`;
  }
  if (eventName === 'issue_comment' && ['created', 'edited'].includes(event.action)) {
    let comment;
    try {
      comment = await client.request(`${client.root}/issues/comments/${event.comment.id}`);
    } catch (error) {
      if (error.status === 404) return 'Comment already removed.';
      throw error;
    }
    const issue = await client.request(`${client.root}/issues/${event.issue.number}`);
    if (issue.pull_request) return 'PR discussions remain open.';
    if (isTrustedBotComment(comment)) return 'Trusted application feedback.';
    if (await client.registered(comment.user)) return 'Registered comment author.';
    try {
      await client.request(`${client.root}/issues/comments/${comment.id}`, 'DELETE');
    } catch (error) {
      if (error.status !== 404) throw error;
    }
    return `Removed unregistered comment ${comment.id}.`;
  }
  throw new Error('Unsupported moderation event.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const client = createClient(process.env.GITHUB_TOKEN, process.env.GITHUB_REPOSITORY);
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  if (event.repository?.id !== REPOSITORY_ID) throw new Error('Unexpected event repository.');
  let result;
  if (process.argv[2] === 'registration-json') {
    result = await validatePullRequestJson(client, event.pull_request.number);
  } else if (process.argv[2] === 'registration') {
    result = await validatePullRequest(client, event.pull_request.number);
  } else if (process.argv[2] === 'moderate') {
    result = await moderate(client, event, process.env.GITHUB_EVENT_NAME);
  } else {
    throw new Error('Choose registration-json, registration or moderate.');
  }
  console.log(result);
}
