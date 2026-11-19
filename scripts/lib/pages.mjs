// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {readFile, readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {normalizeProfile, totals, activeSettlement, taskMentors, rulesSchema, governanceSchema} from './profile.mjs';
import {loadHighlights} from './highlights.mjs';
import {loadRepositoryStats, loadTaskIssues, taskStats} from './task-stats.mjs';
import {buildTaskCatalog} from './tasks.mjs';
import {projects as knownProjects} from '../../site/content.mjs';

const projectNames = new Map(knownProjects.map(project => [project.id, project.name]));
const repoToProjectId = repo => {
  const lower = String(repo || '').toLowerCase();
  if (lower.includes('zephyr')) return 'zephyr';
  if (lower.includes('qemu')) return 'qemu';
  if (lower.includes('humanize') || lower.includes('flowverse') || lower.startsWith('humanfia/')) return 'humanize';
  if (lower.includes('yocto') || lower.includes('openembedded')) return 'yocto';
  if (lower.includes('linux') || lower.includes('openruyi') || lower.includes('sashiko') || lower.includes('elisa-tech')) return 'linux';
  return null;
};

export const repositoryUrl = 'https://github.com/missionhub-oss/mfcp';
const usernameOrder = (a, b) => a.login.toLowerCase().localeCompare(b.login.toLowerCase(), 'en');
const evidenceUrl = source => source.kind === 'registration' ? `${repositoryUrl}/pull/${source.pr}`
  : `${repositoryUrl}/issues/${source.issue}${source.kind === 'comment' ? `#issuecomment-${source.comment}` : ''}`;

export function rankParticipants(participants) {
  const ranked = participants.filter(person => person.level < 4)
    .sort((a, b) => b.stats.experience - a.stats.experience || usernameOrder(a, b));
  let lastScore, lastRank;
  const positions = new Map(ranked.map((person, index) => {
    const rank = person.stats.experience === lastScore ? lastRank : index + 1;
    lastScore = person.stats.experience;
    lastRank = rank;
    return [person.id, rank];
  }));
  return ranked.map(person => ({...person, rank: positions.get(person.id)}));
}

export async function loadProgram(directory, {now = new Date(), sha, issues, repoStats} = {}) {
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
  let governance = {maintainers: [], reviewers: [], interviewers: [], mentors: []};
  try {
    governance = governanceSchema.parse(JSON.parse(await readFile(join(directory, 'programs', String(rules.year), 'governance.json'), 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const rolesFor = githubId => {
    const roles = [];
    if (governance.maintainers.includes(githubId)) roles.push('maintainer');
    if (governance.mentors.some(mentor => mentor.github_id === githubId)) roles.push('mentor');
    if (governance.reviewers.includes(githubId)) roles.push('reviewer');
    if (governance.interviewers.includes(githubId)) roles.push('interviewer');
    return roles;
  };
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
    const settledTasks = [];
    for (const task of profile.contributions) {
      const settlement = activeSettlement(profile, task);
      for (const pr of settlement?.upstream ?? []) upstream.add(`${pr.repository}#${pr.number}`);
      if (settlement) {
        settledTasks.push({
          issue: task.issue,
          difficulty: task.difficulty,
          points: settlement.points,
          settledAt: settlement.proof.at,
          href: evidenceUrl(settlement.proof.source),
          upstream: settlement.upstream.map(pr => ({repository: pr.repository, number: pr.number, url: pr.url})),
        });
        history.push({at: settlement.proof.at, href: evidenceUrl(settlement.proof.source), policy: task.policy.id,
          title: {en: `Task #${task.issue} accepted · +${settlement.points} XP`, zh: `任务 #${task.issue} 验收通过 · +${settlement.points} XP`}});
      } else if (task.stages.length) {
        const stage = task.stages.at(-1);
        history.push({at: stage.proof.at, href: evidenceUrl(stage.proof.source), policy: task.policy.id,
          title: {en: `Task #${task.issue} · ${stage.name === 'validated' ? 'validation' : 'reproduction'} accepted`,
            zh: `任务 #${task.issue} · ${stage.name === 'validated' ? '验证' : '复现'}验收通过`}});
      }
    }
    for (const event of profile.adjustments) history.push({at: event.proof.at, href: evidenceUrl(event.proof.source), policy: '',
      title: {en: `Experience adjusted · −${event.points} XP`, zh: `经验值调整 · −${event.points} XP`}});
    history.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    const recognitions = profile.recognitions.map(record => ({
      id: record.id,
      points: record.points,
      reason: record.reason,
      at: record.proof.at,
      href: evidenceUrl(record.proof.source),
    }));
    const target = profile.level === 1 ? rules.level2 : profile.level === 2 ? rules.level3 : null;
    return {id: profile.github_id, login: profile.github_login, level: profile.level, roles: rolesFor(profile.github_id),
      stats, history, recognitions, settledTasks,
      joinedAt: registration?.proof.at ?? null, updatedAt: profile.updated_at, rank: null,
      githubUrl: `https://github.com/${profile.github_login}`,
      recordUrl: `${repositoryUrl}/blob/${sha}/participants/${profile.github_login.toLowerCase()}.json`,
      avatarUrl: `https://avatars.githubusercontent.com/u/${profile.github_id}?s=96`,
      initials: profile.github_login.slice(0, 2).toUpperCase(),
      nextLevel: profile.level < 4 ? profile.level + 1 : null,
      criteria: target ? Object.entries(target).filter(([, required]) => required > 0).map(([key, required]) =>
        ({key, required, current: stats[key], value: Math.min(stats[key], required)})) : []};
  }).sort((a, b) => b.level - a.level || b.stats.experience - a.stats.experience || usernameOrder(a, b));
  const highlights = await loadHighlights(directory, participants);
  for (const person of participants) {
    const record = highlights.get(person.id);
    if (!record) continue;
    person.declaredProjects = record.projects;
    person.moments = [...record.moments].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }
  const leaderboard = rankParticipants(participants);
  const rankById = new Map(leaderboard.map(person => [person.id, person.rank]));
  for (const person of participants) person.rank = rankById.get(person.id) ?? null;
  const [rawIssues, repositoryStats] = await Promise.all([
    issues ? Promise.resolve(issues) : loadTaskIssues(),
    repoStats ? Promise.resolve(repoStats) : loadRepositoryStats(),
  ]);
  const knownUsers = new Map();
  for (const person of participants) knownUsers.set(person.login.toLowerCase(), {id: person.id, login: person.login});
  for (const mentor of governance.mentors ?? []) knownUsers.set(mentor.github_login.toLowerCase(), {id: mentor.github_id, login: mentor.github_login});
  const tasks = taskStats(rawIssues);
  const taskCatalog = buildTaskCatalog(rawIssues, {rules, repositoryUrl, knownUsers});
  const mentoredById = new Map();
  const mentoredCompletedById = new Map();
  const addMentored = (map, id, issueNumber) => {
    if (!map.has(id)) map.set(id, new Set());
    map.get(id).add(issueNumber);
  };
  for (const profile of profiles) {
    for (const contribution of profile.contributions) {
      const settled = Boolean(activeSettlement(profile, contribution));
      for (const record of taskMentors(contribution)) {
        addMentored(mentoredById, record.mentor_id, contribution.issue);
        if (settled) addMentored(mentoredCompletedById, record.mentor_id, contribution.issue);
      }
    }
  }
  for (const item of taskCatalog.items) {
    for (const mentor of item.mentorDetails ?? []) {
      if (!mentor.id) continue;
      addMentored(mentoredById, mentor.id, item.number);
      if (item.status === 'completed') addMentored(mentoredCompletedById, mentor.id, item.number);
    }
  }
  for (const person of participants) {
    person.mentoring = {
      total: mentoredById.get(person.id)?.size ?? 0,
      completed: mentoredCompletedById.get(person.id)?.size ?? 0,
      projectCount: 0,
    };

    const projectBuckets = new Map();
    const ensureProject = id => {
      if (!projectBuckets.has(id)) {
        projectBuckets.set(id, {
          id,
          name: projectNames.get(id) ?? id,
          ownedTotal: 0,
          ownedCompleted: 0,
          mentoredTotal: 0,
          mentoredCompleted: 0,
          upstreamPrs: 0,
          repositories: new Set(),
        });
      }
      return projectBuckets.get(id);
    };

    const mentoredProjectIds = new Set();
    const loginLower = person.login.toLowerCase();
    for (const item of taskCatalog.items) {
      const isOwner = item.assignees.some(a => a.id === person.id || a.login?.toLowerCase() === loginLower);
      const isMentor = item.mentorDetails?.some(m => m.id === person.id || m.login?.toLowerCase() === loginLower);
      if (isOwner) {
        for (const pid of item.projects) {
          const bucket = ensureProject(pid);
          bucket.ownedTotal += 1;
          if (item.status === 'completed') bucket.ownedCompleted += 1;
        }
      }
      if (isMentor) {
        for (const pid of item.projects) {
          mentoredProjectIds.add(pid);
          const bucket = ensureProject(pid);
          bucket.mentoredTotal += 1;
          if (item.status === 'completed') bucket.mentoredCompleted += 1;
        }
      }
    }

    const contributionsList = [];
    for (const settled of person.settledTasks) {
      for (const pr of settled.upstream) {
        const pid = repoToProjectId(pr.repository);
        if (pid) {
          const bucket = ensureProject(pid);
          bucket.upstreamPrs += 1;
          bucket.repositories.add(pr.repository);
        }
        contributionsList.push({
          kind: 'upstream_pr',
          repository: pr.repository,
          number: pr.number,
          url: pr.url,
          issue: settled.issue,
          difficulty: settled.difficulty,
          points: settled.points,
          at: settled.settledAt,
        });
      }
    }
    for (const rec of person.recognitions) {
      contributionsList.push({
        kind: 'recognition',
        reason: rec.reason,
        points: rec.points,
        url: rec.href,
        at: rec.at,
      });
    }
    contributionsList.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

    person.mentoring.projectCount = mentoredProjectIds.size;
    person.contributionsList = contributionsList;
    person.projects = [...projectBuckets.values()]
      .map(bucket => ({...bucket, repositories: [...bucket.repositories].sort()}))
      .sort((a, b) =>
        (b.upstreamPrs + b.ownedCompleted + b.mentoredCompleted) - (a.upstreamPrs + a.ownedCompleted + a.mentoredCompleted) ||
        (b.ownedTotal + b.mentoredTotal) - (a.ownedTotal + a.mentoredTotal) ||
        a.name.localeCompare(b.name, 'en'));
  }
  return {sha, builtAt: now.toISOString(), rules, governance, participants, leaderboard, taskCatalog,
    repository: {url: repositoryUrl, stars: repositoryStats.stars},
    rulesUrl: `${repositoryUrl}/blob/main/programs/${rules.year}/progression.md`,
    stats: {participants: participants.length, ...tasks,
      experience: participants.reduce((sum, person) => sum + person.stats.experience, 0), pullRequests: upstream.size}};
}
