// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import { z } from 'zod';
import { createHash } from 'node:crypto';

const id = z.number().int().positive().safe();
const login = z.string().regex(/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/i);
const date = z.iso.datetime({offset: true});
const sha = z.string().regex(/^[a-f0-9]{40}$/);
const level = z.number().int().min(0).max(4);
const source = z.discriminatedUnion('kind', [
  z.strictObject({kind: z.literal('comment'), issue: id, comment: id}),
  z.strictObject({kind: z.literal('registration'), pr: id}),
  z.strictObject({kind: z.literal('reopened'), issue: id, event: id}),
  z.strictObject({kind: z.literal('completed'), issue: id, event: id}),
]);
const policy = z.strictObject({id: z.string().regex(/^20\d{2}\.v\d+$/), sha});
const proof = z.strictObject({source, actor: id, at: date, digest: z.string().length(64), details: z.string()});
const upstream = z.strictObject({repository: z.string(), number: id, author: id,
  merge_commit: sha, merged_at: date, commits: z.array(sha).nonempty(), url: z.url()});
const contribution = z.strictObject({
  id: z.string(), issue: id, participant_id: id, mentor_id: id,
  difficulty: level, policy, points: z.number().int().nonnegative(),
  configuration: proof, stages: z.array(z.strictObject({name: z.enum(['reproduced', 'validated']), proof})),
  settlements: z.array(z.strictObject({id: z.string(), proof, upstream: z.array(upstream).nonempty(),
    points: z.number().int().nonnegative()})),
});
const promotion = z.strictObject({id: z.string(), from: level, to: level, policy, proof,
  reason: z.string(), evidence: z.array(proof), review_pr: id.nullable()});
const adjustment = z.strictObject({id: z.string(), contribution_id: z.string(), settlement_id: z.string(),
  points: z.number().int().nonnegative(), proof, review_pr: id.nullable()});
export const identitySchema = z.strictObject({github_id: id, github_login: login});
export const profileSchema = identitySchema.extend({
  schema_version: z.literal(1), level, experience: z.number().int().nonnegative(),
  contributions: z.array(contribution), promotions: z.array(promotion), adjustments: z.array(adjustment),
  last_event: source.nullable(), updated_at: date.nullable(),
});
const threshold = z.strictObject({experience: z.number().int().nonnegative(), tasks: id,
  pull_requests: id, level2_tasks: z.number().int().nonnegative(), level3_tasks: z.number().int().nonnegative()});
export const rulesSchema = z.strictObject({id: z.string().regex(/^20\d{2}\.v\d+$/),
  year: z.number().int().min(2026), effective_at: date,
  points: z.array(z.number().int().nonnegative()).length(5), level2: threshold, level3: threshold,
  level4_recommendations: id, review_approvals: id,
  upstream_repositories: z.array(z.string().regex(/^[\w.-]+\/[\w.-]+$/)).nonempty(),
  upstream_acceptance: z.literal('github_pr')});
export const governanceSchema = z.strictObject({maintainers: z.array(id).nonempty(),
  reviewers: z.array(id).nonempty(), interviewers: z.array(id),
  mentors: z.array(z.strictObject({github_id: id, github_login: login, signoffs: z.array(z.string().min(5)).nonempty()}))});

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
export const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
export const equal = (a, b) => canonical(a) === canonical(b);
export const participantPath = name => `participants/${login.parse(name).toLowerCase()}.json`;
export function initialProfile(identity) {
  return {...identitySchema.parse(identity), schema_version: 1, level: 0, experience: 0,
    contributions: [], promotions: [], adjustments: [], last_event: null, updated_at: null};
}
export function activeSettlement(profile, task) {
  return task.settlements.find(s => !profile.adjustments.some(a => a.settlement_id === s.id));
}
export function totals(profile) {
  const completed = profile.contributions.filter(c => activeSettlement(profile, c));
  const prs = new Set(completed.flatMap(c => activeSettlement(profile, c).upstream.map(p => `${p.repository}#${p.number}`)));
  return {experience: completed.reduce((n, c) => n + activeSettlement(profile, c).points, 0),
    tasks: completed.length, pull_requests: prs.size,
    level2_tasks: completed.filter(c => c.difficulty >= 2).length,
    level3_tasks: completed.filter(c => c.difficulty >= 3).length};
}
export const eligible = (profile, threshold) => Object.entries(threshold).every(([key, value]) => totals(profile)[key] >= value);
export function validateProfile(value, path) {
  const p = profileSchema.parse(value);
  if (participantPath(p.github_login) !== path) throw new Error('Participant filename does not match username.');
  const ids = [...p.contributions.map(c => c.id), ...p.promotions.map(c => c.id), ...p.adjustments.map(c => c.id),
    ...p.contributions.flatMap(c => c.settlements.map(s => s.id))];
  if (ids.length !== new Set(ids).size) throw new Error('Duplicate record IDs.');
  const issues = p.contributions.map(c => c.issue);
  if (issues.length !== new Set(issues).size) throw new Error('Duplicate task contracts.');
  const reversed = new Set();
  for (const a of p.adjustments) {
    const c = p.contributions.find(c => c.id === a.contribution_id);
    const s = c?.settlements.find(s => s.id === a.settlement_id);
    if (!s || s.points !== a.points || reversed.has(s.id)) throw new Error('Invalid or duplicate reversal.');
    reversed.add(s.id);
  }
  const seenPrs = new Set();
  for (const c of p.contributions) {
    if (c.participant_id !== p.github_id || c.mentor_id === p.github_id) throw new Error('Invalid task ownership.');
    if (c.settlements.filter(s => !reversed.has(s.id)).length > 1) throw new Error('Multiple active settlements.');
    const current = activeSettlement(p, c);
    for (const pr of current?.upstream ?? []) {
      const key = `${pr.repository}#${pr.number}`;
      if (seenPrs.has(key) || pr.author !== p.github_id) throw new Error('Duplicated or misattributed upstream contribution.');
      seenPrs.add(key);
    }
  }
  let current = 0;
  for (const event of p.promotions) {
    if (event.from !== current || event.to !== current + 1) throw new Error('Invalid promotion sequence.');
    current = event.to;
  }
  if (p.level !== current || p.experience !== totals(p).experience) throw new Error('Profile totals or level disagree with history.');
  return p;
}
export function normalizeProfile(value, path) {
  if (!('schema_version' in value)) return validateProfile(initialProfile(identitySchema.parse(value)), path);
  return validateProfile(value, path);
}
export function assertIdentityOnly(before, after) {
  const normalized = {...before, github_login: after.github_login};
  if (!equal(normalized, after)) throw new Error('Identity updates must preserve all experience and history.');
}
