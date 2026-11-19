// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {Marked} from 'marked';
import sanitizeHtml from 'sanitize-html';
import {isTaskIssue} from './issue-types.mjs';
import {programYearAt} from './program-year.mjs';
import {projects as knownProjects} from '../../site/content.mjs';

const knownProjectIds = knownProjects.map(project => project.id);
const projectMatchers = [
  ['zephyr', /\bzephyr\b/i],
  ['linux', /\b(?:linux|openruyi)\b/i],
  ['yocto', /\byocto\b/i],
  ['humanize', /\bhumanize\b/i],
  ['qemu', /\bqemu\b/i],
];

const markdown = new Marked({gfm: true, breaks: false});

const sanitizeOptions = {
  allowedTags: [
    'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'strong', 'em', 'del', 's', 'b', 'i', 'sub', 'sup',
    'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'details', 'summary', 'input',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    code: ['class'],
    th: ['align'],
    td: ['align'],
    input: ['type', 'checked', 'disabled'],
  },
  allowedSchemes: ['https', 'http', 'mailto'],
  allowProtocolRelative: false,
  transformTags: {
    h1: 'h2',
    a: (tagName, attribs) => ({
      tagName,
      attribs: {...attribs, target: '_blank', rel: 'noopener noreferrer'},
    }),
    input: (tagName, attribs) => {
      if (attribs.type !== 'checkbox') return {tagName: 'span', attribs: {}};
      const next = {type: 'checkbox', disabled: 'disabled'};
      if ('checked' in attribs) next.checked = 'checked';
      return {tagName, attribs: next};
    },
  },
};

export function classifyTaskStatus(issue) {
  if (issue.state === 'closed') {
    return issue.state_reason === 'completed' ? 'completed' : 'closed';
  }
  return issue.assignees.length > 0 ? 'claimed' : 'available';
}

function labelNames(issue) {
  return (issue.labels ?? []).map(label => typeof label === 'string' ? label : label.name);
}

function extractSection(body, pattern) {
  if (!body) return '';
  const lines = body.replaceAll('\r\n', '\n').split('\n');
  let active = false;
  const collected = [];
  for (const line of lines) {
    const heading = /^#{2,4}\s+(.*)$/.exec(line.trim());
    if (heading) {
      if (active) break;
      if (pattern.test(heading[1])) {
        active = true;
        continue;
      }
    }
    if (active) collected.push(line);
  }
  return collected.join('\n').trim();
}

export function extractProjects(issue) {
  const names = labelNames(issue);
  const found = new Set();
  for (const name of names) {
    if (!name.startsWith('project/')) continue;
    const id = name.slice('project/'.length).toLowerCase();
    if (knownProjectIds.includes(id)) found.add(id);
  }
  if (!found.size && issue.body) {
    const section = extractSection(issue.body, /^project\b|实践项目/i);
    for (const [id, matcher] of projectMatchers) {
      if (matcher.test(section)) found.add(id);
    }
  }
  return knownProjectIds.filter(id => found.has(id));
}

export function extractLevel(issue) {
  for (const name of labelNames(issue)) {
    const match = /^difficulty\/level([0-4])$/.exec(name);
    if (match) return Number(match[1]);
  }
  return null;
}

export function extractYear(issue) {
  const years = labelNames(issue).filter(name => /^20\d{2}$/.test(name));
  if (years.length === 1) return Number(years[0]);
  if (issue.created_at) return programYearAt(issue.created_at);
  return null;
}

export function extractMentors(body) {
  if (!body) return [];
  const mentors = new Map();
  const blockMatch = /<!--\s*mfcp-mentor:start\s*-->([\s\S]*?)<!--\s*mfcp-mentor:end\s*-->/.exec(body);
  if (blockMatch) {
    for (const match of blockMatch[1].matchAll(/Mentor:\s*\[@([a-z0-9-]+)\]/gi)) {
      mentors.set(match[1].toLowerCase(), match[1]);
    }
  }
  if (!mentors.size) {
    const section = extractSection(body, /^mentor\b|导师/i)
      .replace(/<!--[\s\S]*?-->/g, ' ');
    for (const match of section.matchAll(/(?:^|[\s(（【,，;；:：])@([a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38})\b/gi)) {
      const login = match[1];
      if (!/bot$/i.test(login) && login.toLowerCase() !== 'mfcp-progress') {
        mentors.set(login.toLowerCase(), login);
      }
    }
  }
  return [...mentors.values()];
}

function stripMarkdown(text) {
  return text
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[>*+-]\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/(^|\s)\*([^*]+)\*(?=\s|$|[.,;:!?，。；：！？])/g, '$1$2')
    .replace(/(^|\s)_([^_]+)_(?=\s|$|[.,;:!?，。；：！？])/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

function isMostlyAscii(text) {
  const nonAscii = (text.match(/[^\x00-\x7F]/g) || []).length;
  return nonAscii < text.length * 0.2;
}

function truncateClean(text, maxLength) {
  if (text.length <= maxLength) return text;
  const slice = text.slice(0, maxLength);
  const punctuation = Math.max(slice.lastIndexOf('。'), slice.lastIndexOf('；'), slice.lastIndexOf('. '), slice.lastIndexOf('，'), slice.lastIndexOf(', '));
  if (punctuation >= Math.floor(maxLength * 0.55)) {
    return `${slice.slice(0, punctuation).trimEnd()}…`;
  }
  const space = slice.lastIndexOf(' ');
  if (space >= Math.floor(maxLength * 0.65)) {
    return `${slice.slice(0, space).trimEnd()}…`;
  }
  return `${slice.trimEnd()}…`;
}

function cleanBriefSentence(raw) {
  if (!raw) return '';
  const lines = raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !/^https?:\/\//i.test(line) && !/^(?:上游源文件|upstream\s+(?:issue|source|link|pr)|参考|references?)\s*[:：]?/i.test(line));
  const joined = stripMarkdown(lines.join(' '))
    .replace(/\s*(?:上游源文件|Upstream\s+issue|Upstream\s+PR)\s*[:：]?.*$/i, '')
    .trim();
  if (!joined || joined === '_No response_' || joined === 'TBD') return '';
  const firstSentence = joined.match(/^.+?(?:。|[.!?](?=\s|$))/);
  const candidate = firstSentence ? firstSentence[0].trim() : joined;
  return truncateClean(candidate, isMostlyAscii(candidate) ? 120 : 84);
}

export function extractSummary(body) {
  if (!body) return '';
  const candidates = [
    extractSection(body, /^background\b|问题背景/i),
    extractSection(body, /^difficulty rationale\b|难度依据/i),
    extractSection(body, /^goals?\b|目标与交付/i),
    body,
  ];
  for (const candidate of candidates) {
    const clean = cleanBriefSentence(candidate);
    if (clean) return clean;
  }
  return '';
}

export function extractObjectives(body) {
  if (!body) return [];
  const raw = extractSection(body, /^goals?\b|目标与交付/i) || extractSection(body, /^acceptance\b|验收条件/i);
  if (!raw) return [];
  const lines = raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\r\n/g, '\n')
    .split('\n');
  const results = [];
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    if (/^https?:\/\//i.test(trimmed)) continue;
    if (/^[-*•]?\s*`?[A-Za-z0-9_./-]+\.[a-z0-9]+`?\s*(?:→|->)/i.test(trimmed)) continue;
    const bullet = trimmed.replace(/^(?:[-*•+]|\d+[.)])\s+/, '').replace(/^\[[ xX]\]\s+/, '');
    const clean = stripMarkdown(bullet)
      .replace(/[：:]\s*$/, '')
      .trim();
    if (!clean || clean.length < 6 || clean === '_No response_' || clean === 'TBD') continue;
    const limit = isMostlyAscii(clean) ? 88 : 56;
    if (trimmed.endsWith('：') || trimmed.endsWith(':')) {
      if (results.length === 0) results.push(truncateClean(clean, limit));
      continue;
    }
    const firstPart = clean.match(/^.+?(?:。|[.!?](?=\s|$))/)?.[0]?.trim() || clean;
    results.push(truncateClean(firstPart, limit));
    if (results.length >= 2) break;
  }
  return results.slice(0, 2);
}

export function renderTaskBody(body) {
  if (!body) return '';
  const cleaned = body.replace(/<!--[\s\S]*?-->/g, '').trim();
  if (!cleaned) return '';
  return sanitizeHtml(markdown.parse(cleaned), sanitizeOptions);
}

export function cleanTaskTitle(title, number) {
  if (!title) return `Task #${number}`;
  return title.replace(/^\[task\]\s*/i, '').trim() || title;
}

export function parseTaskIssue(issue, {rules, repositoryUrl = 'https://github.com/missionhub-oss/mfcp', knownUsers = new Map()} = {}) {
  const status = classifyTaskStatus(issue);
  const level = extractLevel(issue);
  const xp = level !== null && Array.isArray(rules?.points) ? rules.points[level] ?? null : null;
  const year = extractYear(issue);
  const projects = extractProjects(issue);
  const mentors = extractMentors(issue.body ?? '');
  const mentorDetails = mentors.map(login => {
    const known = knownUsers.get(login.toLowerCase());
    const id = known?.id ?? null;
    const resolvedLogin = known?.login ?? login;
    return {
      id,
      login: resolvedLogin,
      avatarUrl: id ? `https://avatars.githubusercontent.com/u/${id}?s=64` : `https://github.com/${encodeURIComponent(resolvedLogin)}.png?size=64`,
      url: `https://github.com/${encodeURIComponent(resolvedLogin)}`,
    };
  });
  const url = issue.html_url || `${repositoryUrl}/issues/${issue.number}`;
  const assignees = issue.assignees.map(person => ({
    id: person.id,
    login: person.login ?? `user-${person.id}`,
    avatarUrl: person.avatar_url || `https://avatars.githubusercontent.com/u/${person.id}?s=64`,
    url: person.html_url || (person.login ? `https://github.com/${person.login}` : repositoryUrl),
  }));
  const author = issue.user?.id ? {
    id: issue.user.id,
    login: issue.user.login ?? `user-${issue.user.id}`,
    avatarUrl: issue.user.avatar_url || `https://avatars.githubusercontent.com/u/${issue.user.id}?s=64`,
    url: issue.user.html_url || (issue.user.login ? `https://github.com/${issue.user.login}` : repositoryUrl),
  } : null;

  return {
    number: issue.number,
    title: issue.title ?? `Task #${issue.number}`,
    displayTitle: cleanTaskTitle(issue.title, issue.number),
    url,
    state: issue.state,
    stateReason: issue.state_reason ?? null,
    status,
    level,
    xp,
    year,
    projects,
    assignees,
    mentors,
    mentorDetails,
    author,
    comments: issue.comments ?? 0,
    createdAt: issue.created_at ?? null,
    updatedAt: issue.updated_at ?? null,
    closedAt: issue.closed_at ?? null,
    summary: extractSummary(issue.body ?? ''),
    objectives: extractObjectives(issue.body ?? ''),
    bodyHtml: renderTaskBody(issue.body ?? ''),
  };
}

export function buildTaskCatalog(issues, options = {}) {
  const seen = new Map();
  for (const issue of issues) {
    if (!isTaskIssue(issue)) continue;
    seen.set(issue.number, issue);
  }
  const items = [...seen.values()]
    .map(issue => parseTaskIssue(issue, options))
    .sort((a, b) => b.number - a.number);

  const stats = {
    total: items.length,
    available: items.filter(item => item.status === 'available').length,
    claimed: items.filter(item => item.status === 'claimed').length,
    completed: items.filter(item => item.status === 'completed').length,
    closed: items.filter(item => item.status === 'closed').length,
  };

  const years = [...new Set(items.map(item => item.year).filter(year => year !== null))].sort((a, b) => b - a);
  const levels = [1, 2, 3, 4];
  const projectCounts = Object.fromEntries(knownProjectIds.map(id => [
    id,
    items.filter(item => item.projects.includes(id)).length,
  ]));

  return {
    items,
    stats,
    facets: {
      years,
      levels,
      projects: knownProjects.map(project => ({...project, count: projectCounts[project.id] ?? 0})),
    },
  };
}
