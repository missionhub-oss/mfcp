// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {readFile, readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {normalizeProfile, totals, activeSettlement, rulesSchema} from './profile.mjs';
import {DEFAULT_REPOSITORY} from './github.mjs';
import {loadTaskIssues, taskStats} from './task-stats.mjs';

export const repositoryUrl = `https://github.com/${DEFAULT_REPOSITORY}`;
const usernameOrder = (a, b) => a.login.toLowerCase().localeCompare(b.login.toLowerCase(), 'en');
const evidenceUrl = source => source.kind === 'registration' ? `${repositoryUrl}/pull/${source.pr}`
  : `${repositoryUrl}/issues/${source.issue}${source.kind === 'comment' ? `#issuecomment-${source.comment}` : ''}`;

export function rankParticipants(participants) {
  const ranked = [...participants].sort((a, b) => b.stats.experience - a.stats.experience || usernameOrder(a, b));
  let lastScore, lastRank;
  const positions = new Map(ranked.map((person, index) => {
    const rank = person.stats.experience === lastScore ? lastRank : index + 1;
    lastScore = person.stats.experience;
    lastRank = rank;
    return [person.id, rank];
  }));
  return ranked.map(person => ({...person, rank: positions.get(person.id)}));
}

export async function loadProgram(directory, {now = new Date(), sha, issues} = {}) {
  if (!/^[a-f0-9]{40}$/.test(sha ?? '')) throw new Error('A source commit SHA is required to build the public website.');
  const versions = [];
  for (const year of (await readdir(join(directory, 'programs'))).filter(name => /^\d{4}$/.test(name))) {
    let files;
    try {files = await readdir(join(directory, 'programs', year, 'rules'));}
    catch (error) {if (error.code === 'ENOENT') continue; throw error;}
    for (const file of files) versions.push(rulesSchema.parse(JSON.parse(await readFile(join(directory, 'programs', year, 'rules', file), 'utf8'))));
  }
  const rules = versions.filter(rule => Date.parse(rule.effective_at) <= now.getTime())
    .sort((a, b) => Date.parse(b.effective_at) - Date.parse(a.effective_at))[0];
  if (!rules) throw new Error('No effective progression rules.');
  const profiles = [];
  for (const file of (await readdir(join(directory, 'participants'))).filter(name => name.endsWith('.json'))) {
    profiles.push(normalizeProfile(JSON.parse(await readFile(join(directory, 'participants', file), 'utf8')), `participants/${file}`));
  }
  if (new Set(profiles.map(profile => profile.github_id)).size !== profiles.length) throw new Error('Duplicate contributor identities.');
  const upstream = new Set();
  const participants = profiles.map(profile => {
    const stats = totals(profile);
    const registration = profile.promotions.find(event => event.proof.source.kind === 'registration');
    const history = profile.promotions.map(event => ({at: event.proof.at, href: evidenceUrl(event.proof.source), policy: event.policy.id,
      title: event.proof.source.kind === 'registration'
        ? {en: `Registration accepted · L${event.to}`, zh: `注册通过 · L${event.to}`}
        : {en: `Promoted from L${event.from} to L${event.to}`, zh: `从 L${event.from} 晋级至 L${event.to}`}}));
    for (const task of profile.contributions) {
      const settlement = activeSettlement(profile, task);
      for (const pr of settlement?.upstream ?? []) upstream.add(`${pr.repository}#${pr.number}`);
      if (settlement) history.push({at: settlement.proof.at, href: evidenceUrl(settlement.proof.source), policy: task.policy.id,
        title: {en: `Task #${task.issue} accepted · +${settlement.points} XP`, zh: `任务 #${task.issue} 验收通过 · +${settlement.points} XP`}});
      else if (task.stages.length) {
        const stage = task.stages.at(-1);
        history.push({at: stage.proof.at, href: evidenceUrl(stage.proof.source), policy: task.policy.id,
          title: {en: `Task #${task.issue} · ${stage.name === 'validated' ? 'validation' : 'reproduction'} accepted`,
            zh: `任务 #${task.issue} · ${stage.name === 'validated' ? '验证' : '复现'}验收通过`}});
      }
    }
    for (const event of profile.adjustments) history.push({at: event.proof.at, href: evidenceUrl(event.proof.source), policy: '',
      title: {en: `Experience adjusted · −${event.points} XP`, zh: `经验值调整 · −${event.points} XP`}});
    history.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    const target = profile.level === 1 ? rules.level2 : profile.level === 2 ? rules.level3 : null;
    return {id: profile.github_id, login: profile.github_login, level: profile.level, stats, history,
      joinedAt: registration?.proof.at ?? null, updatedAt: profile.updated_at, rank: null,
      githubUrl: `https://github.com/${profile.github_login}`,
      recordUrl: `${repositoryUrl}/blob/${sha}/participants/${profile.github_login.toLowerCase()}.json`,
      avatarUrl: `https://avatars.githubusercontent.com/u/${profile.github_id}?s=96`,
      initials: profile.github_login.slice(0, 2).toUpperCase(),
      nextLevel: profile.level < 4 ? profile.level + 1 : null,
      criteria: target ? Object.entries(target).filter(([, required]) => required > 0).map(([key, required]) =>
        ({key, required, current: stats[key], value: Math.min(stats[key], required)})) : []};
  }).sort((a, b) => b.level - a.level || b.stats.experience - a.stats.experience || usernameOrder(a, b));
  const leaderboard = rankParticipants(participants);
  const rankById = new Map(leaderboard.map(person => [person.id, person.rank]));
  for (const person of participants) person.rank = rankById.get(person.id);
  const tasks = taskStats(issues ?? await loadTaskIssues());
  return {sha, builtAt: now.toISOString(), rules, participants, leaderboard,
    rulesUrl: `${repositoryUrl}/blob/main/programs/${rules.year}/progression.md`,
    stats: {participants: participants.length, ...tasks,
      experience: participants.reduce((sum, person) => sum + person.stats.experience, 0), pullRequests: upstream.size}};
}
