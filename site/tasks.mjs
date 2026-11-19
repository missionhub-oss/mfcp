// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
const pageData = JSON.parse(document.getElementById('page-data').textContent);
const {
  copy,
  repositoryUrl = 'https://github.com/missionhub-oss/mfcp',
  repositorySlug = 'missionhub-oss/mfcp',
  rulesPoints = [0, 10, 30, 60, 100],
  projects = [],
} = pageData;

const projectMap = new Map(projects.map(p => [p.id, p.name]));
const projectIds = projects.map(p => p.id);
const projectMatchers = [
  ['zephyr', /\bzephyr\b/i],
  ['linux', /\b(?:linux|openruyi)\b/i],
  ['yocto', /\byocto\b/i],
  ['humanize', /\bhumanize\b/i],
  ['qemu', /\bqemu\b/i],
];

const grid = document.getElementById('tasks-grid');
const searchInput = document.getElementById('task-search');
const yearSelect = document.getElementById('task-year-filter');
const sortSelect = document.getElementById('task-sort');
const kpiButtons = [...document.querySelectorAll('[data-kpi-status]')];
const projectButtons = [...document.querySelectorAll('#project-filter-group [data-project]')];
const levelButtons = [...document.querySelectorAll('#level-filter-group [data-level]')];
const mineButtons = [...document.querySelectorAll('.tasks-mine-chips [data-mine]')];
const visibleCountEl = document.getElementById('tasks-visible-count');
const totalCountEl = document.getElementById('tasks-total-count');
const resetBtn = document.getElementById('tasks-reset-filters');
const emptyResetBtn = document.getElementById('tasks-empty-reset');
const emptyBox = document.getElementById('tasks-empty');
const paginationNav = document.getElementById('tasks-pagination');
const prevBtn = document.getElementById('tasks-prev-page');
const nextBtn = document.getElementById('tasks-next-page');
const pageStatusEl = document.getElementById('tasks-pagination-status');
const syncButton = document.getElementById('tasks-sync-button');
const syncStatusEl = document.getElementById('tasks-sync-status');
const syncTextEl = document.getElementById('tasks-sync-text');
const syncTimeEl = document.getElementById('tasks-sync-time');
const bannerLoggedOut = document.getElementById('tasks-account-logged-out');
const bannerLoggedIn = document.getElementById('tasks-account-logged-in');
const bannerSummary = document.getElementById('tasks-account-summary');
const bannerLoginBtn = document.getElementById('tasks-banner-login');
const detailDialog = document.getElementById('task-detail-dialog');
const detailCloseBtn = document.getElementById('task-detail-close');
const detailBadgesEl = document.getElementById('task-detail-badges');
const detailTitleEl = document.getElementById('task-detail-title');
const detailMetaEl = document.getElementById('task-detail-meta');
const detailClaimHintEl = document.getElementById('task-detail-claim-hint');
const detailBodyEl = document.getElementById('task-detail-body');
const detailGithubLink = document.getElementById('task-detail-github-link');
const detailGithubLabel = document.getElementById('task-detail-github-label');

const PAGE_SIZE = 18;
let tasks = [];
const knownMentorAvatars = new Map();
let activeDetailNumber = null;
let syncMode = 'snapshot';
let filters = {
  status: 'all',
  project: 'all',
  level: 'all',
  year: 'all',
  sort: 'newest',
  mine: 'all',
  q: '',
  page: 1,
};

function currentLang() {
  return document.documentElement.lang === 'en' ? 'en' : 'zh';
}

function text(key) {
  const lang = currentLang();
  return copy[key]?.[lang] ?? copy[key]?.zh ?? key;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(iso) {
  if (!iso) return '';
  const lang = currentLang();
  try {
    return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en', {
      year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function stripTags(html) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

function sanitizeLiveHtml(rawHtml) {
  const doc = new DOMParser().parseFromString(rawHtml || '', 'text/html');
  const blocked = doc.body.querySelectorAll('script, style, iframe, object, embed, form, meta, link');
  for (const el of blocked) el.remove();
  for (const el of doc.body.querySelectorAll('*')) {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on') || name === 'style') el.removeAttribute(attr.name);
      if ((name === 'href' || name === 'src') && !/^(?:https?:|mailto:|#)/i.test(attr.value.trim())) {
        el.removeAttribute(attr.name);
      }
    }
    if (el.tagName === 'A') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
    if (el.tagName === 'INPUT') {
      if (el.getAttribute('type') === 'checkbox') el.setAttribute('disabled', 'disabled');
      else el.remove();
    }
  }
  return doc.body.innerHTML;
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

function parseLiveIssue(issue) {
  const names = (issue.labels ?? []).map(label => typeof label === 'string' ? label : label.name);
  const status = issue.state === 'closed'
    ? (issue.state_reason === 'completed' ? 'completed' : 'closed')
    : ((issue.assignees?.length ?? 0) > 0 ? 'claimed' : 'available');
  const levelMatch = names.map(name => /^difficulty\/level([0-4])$/.exec(name)).find(Boolean);
  const level = levelMatch ? Number(levelMatch[1]) : null;
  const xp = level !== null ? (rulesPoints[level] ?? null) : null;
  const years = names.filter(name => /^20\d{2}$/.test(name));
  const year = years.length === 1 ? Number(years[0]) : (issue.created_at ? new Date(issue.created_at).getUTCFullYear() : null);

  const foundProjects = new Set();
  for (const name of names) {
    if (!name.startsWith('project/')) continue;
    const id = name.slice('project/'.length).toLowerCase();
    if (projectIds.includes(id)) foundProjects.add(id);
  }
  if (!foundProjects.size && issue.body) {
    const section = extractSection(issue.body, /^project\b|实践项目/i);
    for (const [id, matcher] of projectMatchers) {
      if (matcher.test(section)) foundProjects.add(id);
    }
  }
  const taskProjects = projectIds.filter(id => foundProjects.has(id));

  const mentors = new Map();
  const blockMatch = /<!--\s*mfcp-mentor:start\s*-->([\s\S]*?)<!--\s*mfcp-mentor:end\s*-->/.exec(issue.body ?? '');
  if (blockMatch) {
    for (const m of blockMatch[1].matchAll(/Mentor:\s*\[@([a-z0-9-]+)\]/gi)) mentors.set(m[1].toLowerCase(), m[1]);
  }
  if (!mentors.size && issue.body) {
    const section = extractSection(issue.body, /^mentor\b|导师/i).replace(/<!--[\s\S]*?-->/g, ' ');
    for (const m of section.matchAll(/(?:^|[\s(（【,，;；:：])@([a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38})\b/gi)) {
      if (!/bot$/i.test(m[1]) && m[1].toLowerCase() !== 'mfcp-progress') mentors.set(m[1].toLowerCase(), m[1]);
    }
  }

  const stripMd = val => val
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

  const mostlyAscii = val => ((val.match(/[^\x00-\x7F]/g) || []).length) < val.length * 0.2;

  const truncate = (val, maxLen) => {
    if (val.length <= maxLen) return val;
    const slice = val.slice(0, maxLen);
    const punct = Math.max(slice.lastIndexOf('。'), slice.lastIndexOf('；'), slice.lastIndexOf('. '), slice.lastIndexOf('，'), slice.lastIndexOf(', '));
    if (punct >= Math.floor(maxLen * 0.55)) return `${slice.slice(0, punct).trimEnd()}…`;
    const sp = slice.lastIndexOf(' ');
    if (sp >= Math.floor(maxLen * 0.65)) return `${slice.slice(0, sp).trimEnd()}…`;
    return `${slice.trimEnd()}…`;
  };

  const rawBody = issue.body ?? '';
  const summaryCandidates = [
    extractSection(rawBody, /^background\b|问题背景/i),
    extractSection(rawBody, /^difficulty rationale\b|难度依据/i),
    extractSection(rawBody, /^goals?\b|目标与交付/i),
    rawBody,
  ];
  let summary = '';
  for (const candidate of summaryCandidates) {
    if (!candidate) continue;
    const lines = candidate.replace(/<!--[\s\S]*?-->/g, '').replace(/\r\n/g, '\n').split('\n')
      .map(line => line.trim())
      .filter(line => line && !/^https?:\/\//i.test(line) && !/^(?:上游源文件|upstream\s+(?:issue|source|link|pr)|参考|references?)\s*[:：]?/i.test(line));
    const joined = stripMd(lines.join(' ')).replace(/\s*(?:上游源文件|Upstream\s+issue|Upstream\s+PR)\s*[:：]?.*$/i, '').trim();
    if (!joined || joined === '_No response_' || joined === 'TBD') continue;
    const firstSentence = joined.match(/^.+?(?:。|[.!?](?=\s|$))/)?.[0]?.trim() || joined;
    summary = truncate(firstSentence, mostlyAscii(firstSentence) ? 120 : 84);
    break;
  }

  const objectives = [];
  const goalsRaw = extractSection(rawBody, /^goals?\b|目标与交付/i) || extractSection(rawBody, /^acceptance\b|验收条件/i);
  if (goalsRaw) {
    for (const rawLine of goalsRaw.replace(/<!--[\s\S]*?-->/g, '').replace(/```[\s\S]*?```/g, '').replace(/\r\n/g, '\n').split('\n')) {
      const trimmed = rawLine.trim();
      if (!trimmed || /^https?:\/\//i.test(trimmed)) continue;
      if (/^[-*•]?\s*`?[A-Za-z0-9_./-]+\.[a-z0-9]+`?\s*(?:→|->)/i.test(trimmed)) continue;
      const clean = stripMd(trimmed.replace(/^(?:[-*•+]|\d+[.)])\s+/, '').replace(/^\[[ xX]\]\s+/, '')).replace(/[：:]\s*$/, '').trim();
      if (!clean || clean.length < 6 || clean === '_No response_' || clean === 'TBD') continue;
      const limit = mostlyAscii(clean) ? 88 : 56;
      if (trimmed.endsWith('：') || trimmed.endsWith(':')) {
        if (objectives.length === 0) objectives.push(truncate(clean, limit));
        continue;
      }
      const firstPart = clean.match(/^.+?(?:。|[.!?](?=\s|$))/)?.[0]?.trim() || clean;
      objectives.push(truncate(firstPart, limit));
      if (objectives.length >= 2) break;
    }
  }

  const bodyHtml = issue.body_html ? sanitizeLiveHtml(issue.body_html) : '';
  const displayTitle = (issue.title ?? `Task #${issue.number}`).replace(/^\[task\]\s*/i, '').trim() || issue.title;
  const assignees = (issue.assignees ?? []).map(person => ({
    id: person.id,
    login: person.login,
    avatarUrl: person.avatar_url || `https://avatars.githubusercontent.com/u/${person.id}?s=64`,
    url: person.html_url || `https://github.com/${person.login}`,
  }));
  const author = issue.user?.id ? {
    id: issue.user.id,
    login: issue.user.login,
    avatarUrl: issue.user.avatar_url || `https://avatars.githubusercontent.com/u/${issue.user.id}?s=64`,
    url: issue.user.html_url || `https://github.com/${issue.user.login}`,
  } : null;

  const mentorList = [...mentors.values()];
  const mentorDetails = mentorList.map(login => {
    const cached = knownMentorAvatars.get(login.toLowerCase());
    return {
      id: cached?.id ?? null,
      login: cached?.login ?? login,
      avatarUrl: cached?.avatarUrl ?? `https://github.com/${encodeURIComponent(login)}.png?size=64`,
      url: `https://github.com/${encodeURIComponent(cached?.login ?? login)}`,
    };
  });

  return {
    number: issue.number,
    title: issue.title ?? `Task #${issue.number}`,
    displayTitle,
    url: issue.html_url || `${repositoryUrl}/issues/${issue.number}`,
    state: issue.state,
    stateReason: issue.state_reason ?? null,
    status,
    level,
    xp,
    year,
    projects: taskProjects,
    assignees,
    mentors: mentorList,
    mentorDetails,
    author,
    comments: issue.comments ?? 0,
    createdAt: issue.created_at ?? null,
    updatedAt: issue.updated_at ?? null,
    closedAt: issue.closed_at ?? null,
    summary,
    objectives,
    bodyHtml,
  };
}

function hydrateSearchIndex(items) {
  return items.map(item => ({
    ...item,
    _searchText: [
      `#${item.number}`,
      String(item.number),
      item.title,
      item.displayTitle,
      item.summary,
      ...(item.projects ?? []).map(id => `${id} ${projectMap.get(id) ?? ''}`),
      ...(item.assignees ?? []).map(a => a.login),
      ...(item.mentors ?? []),
      item.level !== null ? `l${item.level}` : '',
      item.year ? String(item.year) : '',
      stripTags(item.bodyHtml),
    ].join(' ').toLowerCase(),
  }));
}

function readFiltersFromUrl() {
  const params = new URLSearchParams(location.search);
  const status = params.get('status');
  if (['all', 'available', 'claimed', 'completed'].includes(status)) filters.status = status;
  const project = params.get('project');
  if (project && (project === 'all' || projectIds.includes(project))) filters.project = project;
  const level = params.get('level');
  if (level !== null && ['all', '1', '2', '3', '4'].includes(level)) filters.level = level;
  const year = params.get('year');
  if (year && (/^20\d{2}$/.test(year) || year === 'all')) filters.year = year;
  const sort = params.get('sort');
  if (['newest', 'updated', 'level-asc', 'level-desc'].includes(sort)) filters.sort = sort;
  const mine = params.get('mine');
  if (['all', 'claimed', 'completed', 'mentored'].includes(mine)) filters.mine = mine;
  const q = params.get('q');
  if (q) filters.q = q;
}

function syncUrlFromFilters() {
  const params = new URLSearchParams();
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.project !== 'all') params.set('project', filters.project);
  if (filters.level !== 'all') params.set('level', filters.level);
  if (filters.year !== 'all') params.set('year', filters.year);
  if (filters.sort !== 'newest') params.set('sort', filters.sort);
  if (filters.mine !== 'all') params.set('mine', filters.mine);
  if (filters.q.trim()) params.set('q', filters.q.trim());
  const qs = params.toString();
  const nextUrl = `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`;
  try {history.replaceState(null, '', nextUrl);} catch {}
}

function updateStatsAndFacets() {
  const total = tasks.length;
  const available = tasks.filter(t => t.status === 'available').length;
  const claimed = tasks.filter(t => t.status === 'claimed').length;
  const completed = tasks.filter(t => t.status === 'completed').length;

  const setNum = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(val);
  };
  setNum('kpi-total', total);
  setNum('kpi-available', available);
  setNum('kpi-claimed', claimed);
  setNum('kpi-completed', completed);
  setNum('tasks-total-count', total);

  const navBadge = document.querySelector('.nav-tasks-count');
  if (navBadge) navBadge.textContent = String(available);

  for (const id of projectIds) {
    const countEl = document.querySelector(`[data-project-count="${id}"]`);
    if (countEl) countEl.textContent = String(tasks.filter(t => t.projects.includes(id)).length);
  }

  if (yearSelect) {
    const years = [...new Set(tasks.map(t => t.year).filter(y => y !== null))].sort((a, b) => b - a);
    const current = filters.year;
    yearSelect.innerHTML = `<option value="all" data-i18n="tasks.filter.allYears">${escapeHtml(text('tasks.filter.allYears'))}</option>` +
      years.map(y => `<option value="${y}">${y}</option>`).join('');
    yearSelect.value = years.map(String).includes(current) ? current : 'all';
    filters.year = yearSelect.value;
  }
}

function updateControlStates() {
  for (const btn of kpiButtons) {
    const active = btn.dataset.kpiStatus === filters.status;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  }
  for (const btn of projectButtons) {
    const active = btn.dataset.project === filters.project;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  }
  for (const btn of levelButtons) {
    const active = btn.dataset.level === filters.level;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  }
  for (const btn of mineButtons) {
    const active = btn.dataset.mine === filters.mine;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  }
  if (searchInput && searchInput.value !== filters.q) searchInput.value = filters.q;
  if (yearSelect) yearSelect.value = filters.year;
  if (sortSelect) sortSelect.value = filters.sort;

  const hasFilters = filters.status !== 'all' || filters.project !== 'all' ||
    filters.level !== 'all' || filters.year !== 'all' || filters.mine !== 'all' ||
    Boolean(filters.q.trim());
  if (resetBtn) resetBtn.hidden = !hasFilters;
}

function filterTasks() {
  const account = window.__mfcpAccount?.getState?.();
  const uid = account?.githubUser?.id;
  const loginLower = account?.githubUser?.login?.toLowerCase();
  const query = filters.q.trim().toLowerCase();
  const tokens = query ? query.split(/\s+/).filter(Boolean) : [];

  const matches = tasks.filter(task => {
    if (filters.status !== 'all' && task.status !== filters.status) return false;
    if (filters.project !== 'all' && !task.projects.includes(filters.project)) return false;
    if (filters.level !== 'all' && String(task.level ?? '') !== filters.level) return false;
    if (filters.year !== 'all' && String(task.year ?? '') !== filters.year) return false;
    if (filters.mine !== 'all' && account?.signedIn) {
      const isAssignee = (task.assignees ?? []).some(a => a.id === uid || a.login?.toLowerCase() === loginLower);
      const isMentor = (task.mentors ?? []).some(m => m.toLowerCase() === loginLower);
      if (filters.mine === 'claimed' && !(task.status === 'claimed' && isAssignee)) return false;
      if (filters.mine === 'completed' && !(task.status === 'completed' && isAssignee)) return false;
      if (filters.mine === 'mentored' && !isMentor) return false;
    }
    if (tokens.length && !tokens.every(tok => task._searchText.includes(tok))) return false;
    return true;
  });

  if (filters.sort === 'updated') {
    matches.sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0) || b.number - a.number);
  } else if (filters.sort === 'level-asc') {
    matches.sort((a, b) => (a.level ?? 99) - (b.level ?? 99) || b.number - a.number);
  } else if (filters.sort === 'level-desc') {
    matches.sort((a, b) => (b.level ?? -1) - (a.level ?? -1) || b.number - a.number);
  } else {
    matches.sort((a, b) => b.number - a.number);
  }
  return matches;
}

function mentorChipsFor(task) {
  const details = task.mentorDetails?.length
    ? task.mentorDetails
    : (task.mentors ?? []).map(login => {
      const cached = knownMentorAvatars.get(login.toLowerCase());
      return {
        login: cached?.login ?? login,
        avatarUrl: cached?.avatarUrl ?? `https://github.com/${encodeURIComponent(login)}.png?size=64`,
        url: `https://github.com/${encodeURIComponent(cached?.login ?? login)}`,
      };
    });
  return details.map(mentor => `
    <a class="task-person-chip is-mentor" href="${escapeHtml(mentor.url)}" target="_blank" rel="noopener noreferrer">
      <img src="${escapeHtml(mentor.avatarUrl)}" alt="" width="20" height="20" loading="lazy">
      <span>@${escapeHtml(mentor.login)}</span>
    </a>`).join('');
}

function renderCardHtml(task) {
  const statusText = text(`tasks.status.${task.status}`);
  const levelPill = task.level !== null
    ? `<span class="task-pill pill-level level-${task.level}">L${task.level}</span>`
    : `<span class="task-pill pill-level">${escapeHtml(text('tasks.filter.pendingLevel'))}</span>`;
  const yearPill = task.year ? `<span class="task-pill pill-year">${task.year}</span>` : '';
  const projectPills = (task.projects ?? []).map(pid =>
    `<span class="task-pill pill-project">${escapeHtml(projectMap.get(pid) ?? pid)}</span>`).join('');

  const peopleHtml = task.assignees?.length
    ? `<span class="task-meta-item"><span class="task-meta-label">${escapeHtml(text('tasks.card.assignee'))}</span>${task.assignees.map(person => `
        <a class="task-person-chip" href="${escapeHtml(person.url)}" target="_blank" rel="noopener noreferrer">
          <img src="${escapeHtml(person.avatarUrl)}" alt="" width="20" height="20" loading="lazy">
          <span>@${escapeHtml(person.login)}</span>
        </a>`).join('')}</span>`
    : `<span class="task-open-hint">${escapeHtml(text('tasks.card.unassigned'))}</span>`;

  const mentorChips = mentorChipsFor(task);
  const mentorHtml = mentorChips
    ? `<span class="task-meta-item"><span class="task-meta-label">${escapeHtml(text('tasks.card.mentor'))}</span>${mentorChips}</span>`
    : '';

  const updatedHtml = task.updatedAt
    ? `<span>${escapeHtml(text('tasks.card.updated'))} <time datetime="${escapeHtml(task.updatedAt)}">${escapeHtml(formatDate(task.updatedAt))}</time></span>`
    : '';

  const ctaText = task.status === 'available' ? text('tasks.card.claim') : text('tasks.card.openGithub');

  return `
    <article class="task-card status-${escapeHtml(task.status)}" data-number="${task.number}">
      <div class="task-card-top">
        <span class="task-status-badge badge-${escapeHtml(task.status)}">${escapeHtml(statusText)}</span>
        <span class="task-number">#${task.number}</span>
        ${levelPill}${yearPill}${projectPills}
      </div>
      <h2 class="task-card-title"><a href="${escapeHtml(task.url)}" target="_blank" rel="noopener noreferrer" data-open-task="${task.number}">${escapeHtml(task.displayTitle)}</a></h2>
      <div class="task-card-meta">
        <div class="task-people">${peopleHtml}${mentorHtml}</div>
        <div class="task-stats-meta">${updatedHtml}<span>${task.comments} ${escapeHtml(text('tasks.card.comments'))}</span></div>
      </div>
      <div class="task-card-actions">
        <button class="task-action-detail js-only" type="button" data-open-task="${task.number}">${escapeHtml(text('tasks.card.details'))}</button>
        <a class="task-action-github${task.status === 'available' ? ' is-claim-cta' : ''}" href="${escapeHtml(task.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ctaText)} <span aria-hidden="true">↗</span></a>
      </div>
    </article>
  `;
}

function renderTasks() {
  updateControlStates();
  const matches = filterTasks();
  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  filters.page = Math.max(1, Math.min(filters.page, pageCount));
  const slice = matches.slice((filters.page - 1) * PAGE_SIZE, filters.page * PAGE_SIZE);

  if (grid) grid.innerHTML = slice.map(renderCardHtml).join('');
  if (visibleCountEl) visibleCountEl.textContent = String(matches.length);
  if (emptyBox) emptyBox.hidden = matches.length !== 0;
  if (paginationNav) paginationNav.hidden = pageCount <= 1;
  if (pageStatusEl) {
    pageStatusEl.textContent = currentLang() === 'zh'
      ? `第 ${filters.page} / ${pageCount} 页`
      : `Page ${filters.page} of ${pageCount}`;
  }
  if (prevBtn) prevBtn.disabled = filters.page <= 1;
  if (nextBtn) nextBtn.disabled = filters.page >= pageCount;
  syncUrlFromFilters();
}

function openTaskDetail(number) {
  const task = tasks.find(item => item.number === number);
  if (!task || !detailDialog) return;
  activeDetailNumber = number;

  const statusBadge = `<span class="task-status-badge badge-${escapeHtml(task.status)}">${escapeHtml(text(`tasks.status.${task.status}`))}</span>`;
  const numberPill = `<span class="task-number">#${task.number}</span>`;
  const levelPill = task.level !== null
    ? `<span class="task-pill pill-level level-${task.level}">L${task.level}</span>`
    : `<span class="task-pill pill-level">${escapeHtml(text('tasks.filter.pendingLevel'))}</span>`;
  const yearPill = task.year ? `<span class="task-pill pill-year">${task.year}</span>` : '';
  const projectPills = (task.projects ?? []).map(pid =>
    `<span class="task-pill pill-project">${escapeHtml(projectMap.get(pid) ?? pid)}</span>`).join('');

  detailBadgesEl.innerHTML = `${statusBadge}${numberPill}${levelPill}${yearPill}${projectPills}`;
  detailTitleEl.textContent = task.displayTitle;

  const metaParts = [];
  if (task.assignees?.length) {
    metaParts.push(`<span class="meta-pair"><span>${escapeHtml(text('tasks.card.assignee'))}</span>${task.assignees.map(a =>
      `<a class="task-person-chip" href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(a.avatarUrl)}" alt="" width="20" height="20"><span>@${escapeHtml(a.login)}</span></a>`).join('')}</span>`);
  }
  const detailMentorChips = mentorChipsFor(task);
  if (detailMentorChips) {
    metaParts.push(`<span class="meta-pair"><span>${escapeHtml(text('tasks.card.mentor'))}</span>${detailMentorChips}</span>`);
  }
  if (task.author?.login) {
    metaParts.push(`<span class="meta-pair"><span>${escapeHtml(text('tasks.detail.author'))}</span><strong>@${escapeHtml(task.author.login)}</strong></span>`);
  }
  if (task.createdAt) {
    metaParts.push(`<span class="meta-pair"><span>${escapeHtml(text('tasks.detail.created'))}</span><strong>${escapeHtml(formatDate(task.createdAt))}</strong></span>`);
  }
  if (task.updatedAt) {
    metaParts.push(`<span class="meta-pair"><span>${escapeHtml(text('tasks.card.updated'))}</span><strong>${escapeHtml(formatDate(task.updatedAt))}</strong></span>`);
  }
  metaParts.push(`<span class="meta-pair"><strong>${task.comments}</strong> <span>${escapeHtml(text('tasks.card.comments'))}</span></span>`);

  detailMetaEl.innerHTML = metaParts.join('');
  detailClaimHintEl.hidden = task.status !== 'available';
  detailBodyEl.innerHTML = task.bodyHtml || `<p class="muted">${escapeHtml(text('tasks.detail.noBody'))}</p>`;
  detailGithubLink.href = task.url;
  detailGithubLabel.textContent = task.status === 'available' ? text('tasks.card.claim') : text('tasks.card.openGithub');

  if (!detailDialog.open) detailDialog.showModal();
  if (location.hash !== `#task-${number}`) {
    try {history.replaceState(null, '', `${location.pathname}${location.search}#task-${number}`);} catch {}
  }
}

function closeTaskDetail() {
  activeDetailNumber = null;
  if (detailDialog?.open) detailDialog.close();
  if (location.hash.startsWith('#task-')) {
    try {history.replaceState(null, '', `${location.pathname}${location.search}`);} catch {}
  }
}

function updateAccountBanner(detail) {
  if (!bannerLoggedOut || !bannerLoggedIn) return;
  const signedIn = Boolean(detail?.signedIn && detail?.githubUser);
  bannerLoggedOut.hidden = signedIn;
  bannerLoggedIn.hidden = !signedIn;
  if (!signedIn) {
    if (filters.mine !== 'all') {
      filters.mine = 'all';
      renderTasks();
    }
    return;
  }
  const u = detail.githubUser;
  const p = detail.mfcpProfile;
  const my = detail.myTasks ?? {claimed: [], completed: [], mentored: []};
  const levelChip = p
    ? `<span class="muted-pill">L${p.level} · ${escapeHtml(text(`level.${p.level}`))}</span><span class="muted-pill is-xp">${p.stats.experience} XP</span>`
    : `<span class="muted-pill">${escapeHtml(text('account.unregistered'))}</span>`;
  bannerSummary.innerHTML = `<img src="${escapeHtml(u.avatar_url)}" alt="" width="30" height="30"><strong>@${escapeHtml(u.login)}</strong>${levelChip}`;
  const setCount = (id, count) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(count);
  };
  setCount('mine-claimed-count', my.claimed.length);
  setCount('mine-completed-count', my.completed.length);
  setCount('mine-mentored-count', my.mentored.length);
  const openProfileLink = document.getElementById('tasks-open-profile');
  if (openProfileLink && window.__mfcpAccount?.getProfileUrl) {
    openProfileLink.href = window.__mfcpAccount.getProfileUrl(u.login, Boolean(p));
  }
}

async function syncLiveFromGitHub() {
  if (!syncButton) return;
  syncButton.disabled = true;
  syncButton.textContent = text('tasks.syncing');
  syncStatusEl?.classList.remove('is-error');
  syncStatusEl?.classList.add('is-syncing');
  try {
    const headers = {
      Accept: 'application/vnd.github.full+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    const collected = [];
    for (let page = 1; page <= 10; page++) {
      const url = new URL(`https://api.github.com/repos/${repositorySlug}/issues`);
      url.search = new URLSearchParams({
        state: 'all',
        type: 'Task',
        sort: 'created',
        direction: 'asc',
        per_page: '100',
        page: String(page),
      }).toString();
      const response = await fetch(url, {headers});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const batch = await response.json();
      if (!Array.isArray(batch)) throw new Error('Invalid response');
      collected.push(...batch.filter(item => !item.pull_request && item.type?.name === 'Task'));
      if (batch.length < 100) break;
    }

    const parsed = collected.map(parseLiveIssue).sort((a, b) => b.number - a.number);
    tasks = hydrateSearchIndex(parsed);
    updateStatsAndFacets();
    renderTasks();
    if (activeDetailNumber !== null) openTaskDetail(activeDetailNumber);

    const nowIso = new Date().toISOString();
    syncMode = 'live';
    if (syncTextEl) syncTextEl.textContent = text('tasks.liveSynced');
    if (syncTimeEl) {
      syncTimeEl.setAttribute('datetime', nowIso);
      syncTimeEl.textContent = new Intl.DateTimeFormat(currentLang() === 'zh' ? 'zh-CN' : 'en', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
      }).format(new Date(nowIso));
    }
    window.dispatchEvent(new CustomEvent('mfcp:tasks-updated', {detail: {items: tasks}}));
  } catch {
    syncMode = 'error';
    syncStatusEl?.classList.add('is-error');
    if (syncTextEl) syncTextEl.textContent = text('tasks.syncFailed');
  } finally {
    syncStatusEl?.classList.remove('is-syncing');
    syncButton.disabled = false;
    syncButton.textContent = text('tasks.sync');
  }
}

function resetAllFilters() {
  filters = {...filters, status: 'all', project: 'all', level: 'all', year: 'all', mine: 'all', q: '', page: 1};
  renderTasks();
}

function checkHashDeepLink() {
  const match = /^#task-(\d+)$/.exec(location.hash);
  if (match) openTaskDetail(Number(match[1]));
}

// Event bindings
for (const btn of kpiButtons) {
  btn.addEventListener('click', () => {
    filters.status = btn.dataset.kpiStatus;
    filters.page = 1;
    renderTasks();
  });
}
for (const btn of projectButtons) {
  btn.addEventListener('click', () => {
    filters.project = btn.dataset.project;
    filters.page = 1;
    renderTasks();
  });
}
for (const btn of levelButtons) {
  btn.addEventListener('click', () => {
    filters.level = btn.dataset.level;
    filters.page = 1;
    renderTasks();
  });
}
for (const btn of mineButtons) {
  btn.addEventListener('click', () => {
    filters.mine = btn.dataset.mine;
    filters.page = 1;
    renderTasks();
  });
}
searchInput?.addEventListener('input', () => {
  filters.q = searchInput.value;
  filters.page = 1;
  renderTasks();
});
yearSelect?.addEventListener('change', () => {
  filters.year = yearSelect.value;
  filters.page = 1;
  renderTasks();
});
sortSelect?.addEventListener('change', () => {
  filters.sort = sortSelect.value;
  filters.page = 1;
  renderTasks();
});
resetBtn?.addEventListener('click', resetAllFilters);
emptyResetBtn?.addEventListener('click', resetAllFilters);
prevBtn?.addEventListener('click', () => {
  filters.page = Math.max(1, filters.page - 1);
  renderTasks();
  document.getElementById('tasks-title')?.scrollIntoView({block: 'start'});
});
nextBtn?.addEventListener('click', () => {
  filters.page += 1;
  renderTasks();
  document.getElementById('tasks-title')?.scrollIntoView({block: 'start'});
});

grid?.addEventListener('click', event => {
  const triggerEl = event.target.closest('[data-open-task]');
  if (!triggerEl) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  openTaskDetail(Number(triggerEl.getAttribute('data-open-task')));
});

detailCloseBtn?.addEventListener('click', closeTaskDetail);
detailDialog?.addEventListener('click', event => {
  if (event.target === detailDialog) closeTaskDetail();
});
detailDialog?.addEventListener('cancel', () => {
  activeDetailNumber = null;
  if (location.hash.startsWith('#task-')) {
    try {history.replaceState(null, '', `${location.pathname}${location.search}`);} catch {}
  }
});

syncButton?.addEventListener('click', syncLiveFromGitHub);
bannerLoginBtn?.addEventListener('click', () => window.__mfcpAccount?.openDialog?.());

window.addEventListener('hashchange', checkHashDeepLink);
window.addEventListener('mfcp:language-change', () => {
  if (syncTextEl) {
    syncTextEl.textContent = text(syncMode === 'live' ? 'tasks.liveSynced' : syncMode === 'error' ? 'tasks.syncFailed' : 'tasks.synced');
  }
  if (syncButton && !syncButton.disabled) syncButton.textContent = text('tasks.sync');
  if (tasks.length) {
    updateStatsAndFacets();
    renderTasks();
    if (activeDetailNumber !== null && detailDialog?.open) openTaskDetail(activeDetailNumber);
  }
  const currentAccount = window.__mfcpAccount?.getState?.();
  if (currentAccount) updateAccountBanner(currentAccount);
});
window.addEventListener('mfcp:account-change', event => {
  updateAccountBanner(event.detail);
  if (tasks.length && filters.mine !== 'all') renderTasks();
});

window.__mfcpTasks = {
  getItems: () => tasks,
  openTaskDetail,
  syncLiveFromGitHub,
};

// Bootstrap from pre-built snapshot JSON
readFiltersFromUrl();
try {
  const response = await fetch('./tasks-data.json', {cache: 'no-cache'});
  if (response.ok) {
    const data = await response.json();
    for (const item of data.items ?? []) {
      for (const mentor of item.mentorDetails ?? []) {
        knownMentorAvatars.set(mentor.login.toLowerCase(), mentor);
      }
    }
    tasks = hydrateSearchIndex(data.items ?? []);
    updateStatsAndFacets();
    renderTasks();
    window.dispatchEvent(new CustomEvent('mfcp:tasks-updated', {detail: {items: tasks}}));
    checkHashDeepLink();
  }
} catch {}

const existingAccount = window.__mfcpAccount?.getState?.();
if (existingAccount) updateAccountBanner(existingAccount);
