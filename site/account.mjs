// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
const pageData = JSON.parse(document.getElementById('page-data').textContent);
const {
  copy,
  homePath = '',
  repositoryUrl = 'https://github.com/missionhub-oss/mfcp',
  profileLogin = null,
  profileData = null,
  leaderboardCount: initialLeaderboardCount = null,
} = pageData;

const SESSION_KEY = 'mfcp.github.session.v1';
const LEGACY_LOGIN_KEY = 'mfcp.github.login';
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/i;
const RESERVED_ROUTES = new Set(['assets', 'events', 'leaderboard', 'news', 'profile', 'slides', 'tasks']);

const trigger = document.getElementById('account-trigger');
const dialog = document.getElementById('account-dialog');
const closeBtn = document.getElementById('account-dialog-close');
const loginForm = document.getElementById('account-login-form');
const usernameInput = document.getElementById('github-username-input');
const errorBox = document.getElementById('account-login-error');
const submitBtn = document.getElementById('account-login-submit');
const datalistEl = document.getElementById('mfcp-participant-list');

const isProfilePage = document.body.dataset.page === 'profile';
const profilePageSignIn = document.getElementById('profile-page-signin');
const profilePageDashboard = document.getElementById('profile-page-dashboard');
const profilePageContent = document.getElementById('profile-page-content');
const profileLoginForm = document.getElementById('profile-login-form');
const profileUsernameInput = document.getElementById('profile-username-input');
const profileErrorBox = document.getElementById('profile-signin-error');
const profileSubmitBtn = document.getElementById('profile-login-submit');

const TASK_PAGE_SIZE = 6;
const CONTRIB_PAGE_SIZE = 6;

let profileIndexCache = null;
let tasksDataCache = null;

// Visitor's own signed-in session (cached in localStorage)
let sessionState = {
  githubUser: null,
  mfcpProfile: null,
  leaderboardCount: initialLeaderboardCount,
  cachedAt: null,
  myTasks: {claimed: [], completed: [], mentored: []},
};

// Currently displayed resume on /<username>/ or /profile/
let viewState = {
  githubUser: null,
  mfcpProfile: null,
  leaderboardCount: initialLeaderboardCount,
  myTasks: {claimed: [], completed: [], mentored: []},
};

let uiState = {
  taskTab: null,
  taskPage: 1,
  mentorTab: 'all',
  mentorPage: 1,
  contribPage: 1,
};

function currentLang() {
  return document.documentElement.lang === 'en' ? 'en' : 'zh';
}

function text(key) {
  const lang = currentLang();
  return copy[key]?.[lang] ?? copy[key]?.zh ?? key;
}

function localized(value) {
  if (typeof value === 'string') return value;
  const lang = currentLang();
  return value?.[lang] ?? value?.zh ?? value?.en ?? '';
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

function getProfileUrl(login, registered = true) {
  const slug = String(login || '').trim().toLowerCase();
  if (registered && slug && !RESERVED_ROUTES.has(slug)) {
    return `${homePath}${encodeURIComponent(slug)}/`;
  }
  return `${homePath}profile/?user=${encodeURIComponent(login)}`;
}

function readCachedSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.githubUser?.login) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCachedSession(session) {
  try {
    localStorage.removeItem(LEGACY_LOGIN_KEY);
    if (!session) {
      localStorage.removeItem(SESSION_KEY);
      return;
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      login: session.githubUser.login,
      githubUser: session.githubUser,
      mfcpProfile: session.mfcpProfile,
      leaderboardCount: session.leaderboardCount ?? null,
      cachedAt: session.cachedAt || new Date().toISOString(),
    }));
  } catch {}
}

function populateSuggestions(profileIndex) {
  if (!datalistEl || !profileIndex?.participants?.length || datalistEl.childElementCount > 0) return;
  datalistEl.innerHTML = profileIndex.participants
    .map(person => `<option value="${escapeHtml(person.login)}"></option>`)
    .join('');
}

async function loadProfileIndex() {
  if (profileIndexCache) return profileIndexCache;
  const response = await fetch(`${homePath}profile-index.json`, {cache: 'no-cache'});
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  profileIndexCache = await response.json();
  populateSuggestions(profileIndexCache);
  return profileIndexCache;
}

async function loadTasksData() {
  if (window.__mfcpTasks?.getItems) {
    const liveItems = window.__mfcpTasks.getItems();
    if (Array.isArray(liveItems) && liveItems.length) return liveItems;
  }
  if (tasksDataCache) return tasksDataCache;
  const response = await fetch(`${homePath}tasks/tasks-data.json`, {cache: 'no-cache'});
  if (!response.ok) return [];
  const data = await response.json();
  tasksDataCache = Array.isArray(data.items) ? data.items : [];
  return tasksDataCache;
}

async function fetchPublicGitHubUser(login) {
  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (response.status === 404) {
    const err = new Error('NOT_FOUND');
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (response.status === 403) {
    const err = new Error('RATE_LIMIT');
    err.code = 'RATE_LIMIT';
    throw err;
  }
  if (!response.ok) {
    const err = new Error(`HTTP_${response.status}`);
    err.code = 'NETWORK';
    throw err;
  }
  return response.json();
}

function computeMyTasks(githubUser, tasks) {
  if (!githubUser || !Array.isArray(tasks)) return {claimed: [], completed: [], mentored: []};
  const uid = githubUser.id;
  const loginLower = githubUser.login.toLowerCase();
  const isAssignee = task => (task.assignees ?? []).some(a => (uid && a.id === uid) || a.login?.toLowerCase() === loginLower);
  const isMentor = task => (task.mentors ?? []).some(m => m.toLowerCase() === loginLower);
  return {
    claimed: tasks.filter(task => task.status === 'claimed' && isAssignee(task)),
    completed: tasks.filter(task => task.status === 'completed' && isAssignee(task)),
    mentored: tasks.filter(task => isMentor(task)),
  };
}

function emitAccountChange() {
  window.dispatchEvent(new CustomEvent('mfcp:account-change', {
    detail: {
      signedIn: Boolean(sessionState.githubUser),
      githubUser: sessionState.githubUser,
      mfcpProfile: sessionState.mfcpProfile,
      myTasks: sessionState.myTasks,
    },
  }));
}

function updateHeaderTrigger() {
  if (!trigger) return;
  if (!sessionState.githubUser) {
    trigger.classList.remove('is-signed-in');
    trigger.setAttribute('aria-label', text('account.signInAria'));
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.innerHTML = `<svg class="account-user-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg><span class="account-trigger-label">${escapeHtml(text('account.signIn'))}</span>`;
    return;
  }
  const u = sessionState.githubUser;
  const p = sessionState.mfcpProfile;
  const badge = p
    ? `<span class="account-trigger-badge">L${p.level}</span>`
    : `<span class="account-trigger-badge is-unregistered">NEW</span>`;
  trigger.classList.add('is-signed-in');
  trigger.setAttribute('aria-label', text('account.profileAria'));
  trigger.removeAttribute('aria-haspopup');
  trigger.innerHTML = `<img class="account-trigger-avatar" src="${escapeHtml(u.avatar_url)}" alt="" width="24" height="24"><span class="account-trigger-label">@${escapeHtml(u.login)}</span>${badge}`;
}

function resolveDefaultTaskTab(myTasks) {
  if (myTasks.claimed.length) return 'claimed';
  if (myTasks.completed.length) return 'completed';
  return 'claimed';
}

function pagerHtml(kind, page, pageCount) {
  if (pageCount <= 1) return '';
  const status = currentLang() === 'zh'
    ? `第 ${page} / ${pageCount} 页`
    : `Page ${page} of ${pageCount}`;
  return `
    <div class="profile-pager">
      <button type="button" data-pager="${kind}" data-delta="-1" ${page <= 1 ? 'disabled' : ''}>${escapeHtml(text('pagination.previous'))}</button>
      <span>${escapeHtml(status)}</span>
      <button type="button" data-pager="${kind}" data-delta="1" ${page >= pageCount ? 'disabled' : ''}>${escapeHtml(text('pagination.next'))}</button>
    </div>
  `;
}

function renderTaskLinksList(items, emptyText, page, pagerKind, {showMentor = false, showAssignee = false} = {}) {
  if (!items.length) {
    return `<div class="profile-panel-body"><p class="small muted profile-empty-slot">${escapeHtml(emptyText)}</p></div>`;
  }
  const pageCount = Math.max(1, Math.ceil(items.length / TASK_PAGE_SIZE));
  const safePage = Math.max(1, Math.min(page, pageCount));
  const slice = items.slice((safePage - 1) * TASK_PAGE_SIZE, safePage * TASK_PAGE_SIZE);
  const rows = slice.map(task => {
    const href = `${homePath}tasks/#task-${task.number}`;
    const levelBadge = task.level !== null
      ? `<span class="profile-quest-rank level-${task.level}">L${task.level}</span>`
      : '';
    let counterpart = '';
    if (showMentor && task.mentors?.length) {
      counterpart = `<span class="profile-quest-peer">${escapeHtml(text('account.mentoring.by'))} @${escapeHtml(task.mentors[0])}</span>`;
    } else if (showAssignee && task.assignees?.length) {
      counterpart = `<span class="profile-quest-peer">${escapeHtml(text('account.mentoring.assignee'))} @${escapeHtml(task.assignees[0].login)}</span>`;
    }
    return `<li class="status-${escapeHtml(task.status || 'available')}"><a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"><span class="profile-quest-dot" aria-hidden="true"></span><span class="account-task-num">#${task.number}</span><span class="profile-quest-title">${escapeHtml(task.displayTitle || task.title)}</span></a>${counterpart}${levelBadge}</li>`;
  }).join('');
  return `<div class="profile-panel-body"><ul class="account-task-list">${rows}</ul></div>${pagerHtml(pagerKind, safePage, pageCount)}`;
}

function renderLevelBar(p) {
  if (!p) return '';
  const xpCriterion = p.criteria?.find(c => c.key === 'experience');
  let progressPct = 100;
  let rightNote = `${p.stats.experience} XP · ${text('account.levelMax')}`;
  if (xpCriterion) {
    progressPct = Math.min(100, Math.round((xpCriterion.current / xpCriterion.required) * 100));
    rightNote = `${xpCriterion.current} / ${xpCriterion.required} XP → L${p.nextLevel}`;
  } else if (p.level === 0) {
    progressPct = 15;
    rightNote = `L0 → L1`;
  } else if (p.level === 3) {
    progressPct = 85;
    rightNote = `${p.stats.experience} XP · L3 → L4`;
  }
  const steps = [0, 1, 2, 3, 4].map(lv => {
    const cls = lv < p.level ? 'is-done' : lv === p.level ? 'is-current' : '';
    return `<span class="resume-level-node ${cls}">L${lv}</span>`;
  }).join('');
  return `
    <div class="resume-level-box">
      <div class="resume-level-head">
        <span>${escapeHtml(text('account.levelTrack'))} <strong>L${p.level} · ${escapeHtml(text(`level.${p.level}`))}</strong></span>
        <span class="resume-level-xp">${escapeHtml(rightNote)}</span>
      </div>
      <div class="resume-level-track" role="progressbar" aria-valuenow="${progressPct}" aria-valuemin="0" aria-valuemax="100">
        <span class="resume-level-fill" style="width:${progressPct}%"></span>
      </div>
      <div class="resume-level-steps" aria-hidden="true">${steps}</div>
    </div>
  `;
}

function renderProfilePage() {
  if (!isProfilePage) return;
  const active = viewState.githubUser ? viewState : (profileLogin ? null : sessionState);
  const signedIn = Boolean(active?.githubUser);
  if (profilePageSignIn) profilePageSignIn.hidden = signedIn;
  if (profilePageDashboard) profilePageDashboard.hidden = !signedIn;
  if (!signedIn || !profilePageContent) return;

  const lang = currentLang();
  const u = active.githubUser;
  const p = active.mfcpProfile;
  const isOwnSession = Boolean(
    sessionState.githubUser && sessionState.githubUser.login.toLowerCase() === u.login.toLowerCase(),
  );

  const rolesHtml = (p?.roles ?? []).map(role =>
    `<span class="account-badge is-role">${escapeHtml(text(`account.role.${role}`))}</span>`).join('');

  const statusBadge = p
    ? `<span class="account-badge is-registered">${escapeHtml(text('account.registered'))}</span>`
    : `<span class="account-badge is-unregistered">${escapeHtml(text('account.unregistered'))}</span>`;

  const levelBadge = p
    ? `<span class="account-badge is-level">L${p.level} · ${escapeHtml(text(`level.${p.level}`))}</span>`
    : '';

  const avatarRankCrest = p
    ? `<span class="account-avatar-rank level-${p.level}">L${p.level}</span>`
    : '';

  const {claimed, completed, mentored} = active.myTasks;
  const mentoredCompletedItems = mentored.filter(task => task.status === 'completed');
  const liveMentoredTotal = mentored.length;
  const liveMentoredCompleted = mentoredCompletedItems.length;
  const mentoredTotal = Math.max(p?.mentoring?.total ?? 0, liveMentoredTotal);
  const mentoredCompleted = Math.max(p?.mentoring?.completed ?? 0, liveMentoredCompleted);
  const mentoredProjectCount = p?.mentoring?.projectCount ?? new Set(mentored.flatMap(t => t.projects ?? [])).size;

  const projectItems = (p?.declaredProjects ?? []).map(item => ({...item, declared: true,
    name: localized(item.name), ownedTotal: 0, ownedCompleted: 0, mentoredTotal: 0,
    mentoredCompleted: 0, upstreamPrs: 0, repositories: []}));
  for (const derived of p?.projects ?? []) {
    const item = projectItems.find(project => project.id === derived.id);
    if (!item) {
      projectItems.push({...derived});
      continue;
    }
    Object.assign(item, {
      ownedTotal: derived.ownedTotal,
      ownedCompleted: derived.ownedCompleted,
      mentoredTotal: derived.mentoredTotal,
      mentoredCompleted: derived.mentoredCompleted,
      upstreamPrs: derived.upstreamPrs,
      repositories: derived.repositories,
    });
  }
  const momentCounts = new Map();
  for (const moment of p?.moments ?? []) {
    momentCounts.set(moment.project, (momentCounts.get(moment.project) ?? 0) + 1);
  }

  // Inline compact metrics inside top Hero left column
  const heroMetricsHtml = p ? `
    <div class="resume-hero-metrics">
      <div class="resume-metric is-xp"><span>${escapeHtml(text('account.stats.xp'))}</span><strong>${p.stats.experience}</strong></div>
      <div class="resume-metric"><span>${escapeHtml(text('account.stats.tasks'))}</span><strong>${p.stats.tasks}</strong></div>
      <div class="resume-metric"><span>${escapeHtml(text('account.stats.prs'))}</span><strong>${p.stats.pull_requests}</strong></div>
      <div class="resume-metric is-mentor"><span>${escapeHtml(text('account.stats.mentored'))}</span><strong>${mentoredTotal}</strong></div>
      <div class="resume-metric is-mentor"><span>${escapeHtml(text('account.stats.mentoredCompleted'))}</span><strong>${mentoredCompleted}</strong></div>
    </div>
  ` : '';

  // Card 1: Participating Open-Source Projects (replaces Progression)
  let card1Body = '';
  if (!p) {
    const snippet = JSON.stringify({github_login: u.login, github_id: u.id}, null, 2);
    card1Body = `
      <div class="account-unregistered-box">
        <p>${escapeHtml(text('account.unregisteredBody'))}</p>
        <div class="account-snippet-head">
          <span><code>participants/${escapeHtml(u.login.toLowerCase())}.json</code></span>
          <button class="account-small-btn" type="button" data-action="copy-snippet">${escapeHtml(text('account.copySnippet'))}</button>
        </div>
        <pre class="account-snippet" data-register-json>${escapeHtml(snippet)}</pre>
        <a class="button primary" href="${escapeHtml(repositoryUrl)}/blob/main/participants/README.md" target="_blank" rel="noopener noreferrer">${escapeHtml(text('account.goRegister'))} <span aria-hidden="true">↗</span></a>
      </div>
    `;
  } else if (projectItems.length) {
    const rows = projectItems.map(proj => {
      const badges = [];
      if (proj.declared && proj.role) badges.push(`<span class="is-role">${escapeHtml(localized(proj.role))}</span>`);
      if (proj.ownedTotal) badges.push(`<span>${escapeHtml(text('account.projects.owned'))} <strong>${proj.ownedCompleted}/${proj.ownedTotal}</strong></span>`);
      if (proj.mentoredTotal) badges.push(`<span class="is-mentor">${escapeHtml(text('account.projects.mentored'))} <strong>${proj.mentoredCompleted}/${proj.mentoredTotal}</strong></span>`);
      if (proj.upstreamPrs) badges.push(`<span class="is-pr">${escapeHtml(text('account.projects.prs'))} <strong>${proj.upstreamPrs}</strong></span>`);
      const moments = momentCounts.get(proj.id) ?? 0;
      if (moments) badges.push(`<span class="is-moment">${moments} ${escapeHtml(text(moments === 1 ? 'account.projects.moment' : 'account.projects.moments'))}</span>`);
      const reposHtml = proj.repositories?.length
        ? `<div class="resume-project-repos">${proj.repositories.map(repo =>
          `<a href="https://github.com/${escapeHtml(repo)}" target="_blank" rel="noopener noreferrer">${escapeHtml(repo)} ↗</a>`).join('')}</div>`
        : '';
      const summaryHtml = proj.summary
        ? `<p class="resume-project-summary">${escapeHtml(localized(proj.summary))}</p>`
        : '';
      const name = escapeHtml(localized(proj.name));
      const nameHref = proj.url ?? `${homePath}tasks/?project=${encodeURIComponent(proj.id)}`;
      const nameAttrs = proj.url ? 'target="_blank" rel="noopener noreferrer"' : '';
      return `
        <li class="resume-project-item">
          <div class="resume-project-top">
            <a class="resume-project-name" href="${escapeHtml(nameHref)}" ${nameAttrs}>${name}</a>
            <div class="resume-project-stats">${badges.join('')}</div>
          </div>
          ${summaryHtml}
          ${reposHtml}
        </li>
      `;
    }).join('');
    card1Body = `<ul class="resume-project-list">${rows}</ul>`;
  } else {
    card1Body = `<p class="small muted profile-empty-slot">${escapeHtml(text('account.projects.none'))}</p>`;
  }

  const card1Html = `
    <section class="profile-panel">
      <h3 class="profile-panel-title"><span class="panel-rune" aria-hidden="true">◆</span>${escapeHtml(text('account.section.projects'))}<span class="panel-count">${projectItems.length}</span></h3>
      <div class="profile-panel-body">${card1Body}</div>
    </section>
  `;

  // Card 2: Tasks Owned (Guided by Mentors — "别人指导他")
  const myTaskTabs = [
    {id: 'claimed', label: text('account.tasks.claimed'), items: claimed},
    {id: 'completed', label: text('account.tasks.completed'), items: completed},
  ];
  if (!uiState.taskTab || !myTaskTabs.some(tab => tab.id === uiState.taskTab)) {
    uiState.taskTab = resolveDefaultTaskTab(active.myTasks);
    uiState.taskPage = 1;
  }
  const activeTaskTab = myTaskTabs.find(tab => tab.id === uiState.taskTab) || myTaskTabs[0];
  const card2Html = `
    <section class="profile-panel">
      <div class="profile-panel-head">
        <h3 class="profile-panel-title"><span class="panel-rune" aria-hidden="true">◆</span>${escapeHtml(text('account.section.myTasks'))}<span class="panel-count">${claimed.length + completed.length}</span></h3>
        <a class="profile-panel-link" href="${escapeHtml(homePath)}tasks/" target="_blank" rel="noopener noreferrer">${escapeHtml(text('account.tasks.openPlaza'))} <span aria-hidden="true">↗</span></a>
      </div>
      <div class="profile-tab-bar" role="tablist">
        ${myTaskTabs.map(tab => `
          <button class="profile-tab${tab.id === activeTaskTab.id ? ' is-active' : ''}" type="button" role="tab" aria-selected="${tab.id === activeTaskTab.id}" data-task-tab="${tab.id}">
            <span>${escapeHtml(tab.label)}</span>
            <span class="profile-tab-count">${tab.items.length}</span>
          </button>
        `).join('')}
      </div>
      ${renderTaskLinksList(activeTaskTab.items, text('account.tasks.none'), uiState.taskPage, 'tasks', {showMentor: true})}
    </section>
  `;

  // Card 3: Open-Source Moments (declared milestones + merged upstream PRs + recognitions)
  const rawContributions = [...(p?.moments ?? []), ...(p?.contributionsList ?? [])]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  if (!rawContributions.length && p?.history?.length) {
    for (const ev of p.history) {
      rawContributions.push({
        kind: 'milestone',
        title: ev.title?.[lang] ?? ev.title?.zh ?? '',
        url: ev.href,
        at: ev.at,
      });
    }
  }
  const contribPageCount = Math.max(1, Math.ceil(rawContributions.length / CONTRIB_PAGE_SIZE));
  uiState.contribPage = Math.max(1, Math.min(uiState.contribPage, contribPageCount));
  const contribSlice = rawContributions.slice((uiState.contribPage - 1) * CONTRIB_PAGE_SIZE, uiState.contribPage * CONTRIB_PAGE_SIZE);
  const card3Inner = contribSlice.length
    ? `<div class="profile-panel-body"><ul class="resume-contrib-list">${contribSlice.map(item => {
        if (item.kind === 'maintainer' || item.kind === 'reviewer' || item.kind === 'contributor') {
          const project = projectItems.find(entry => entry.id === item.project);
          return `
            <li class="resume-contrib-item is-moment">
              <div class="resume-contrib-main">
                <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(localized(item.title))} <span aria-hidden="true">↗</span></a>
                <span class="contrib-meta">${escapeHtml(project ? localized(project.name) : item.project)} · ${escapeHtml(text(`account.moment.${item.kind}`))}</span>
                <p class="contrib-summary">${escapeHtml(localized(item.summary))}</p>
              </div>
              <time datetime="${escapeHtml(item.at)}">${escapeHtml(formatDate(item.at))}</time>
            </li>
          `;
        }
        if (item.kind === 'upstream_pr') {
          return `
            <li class="resume-contrib-item is-pr">
              <div class="resume-contrib-main">
                <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer"><span class="contrib-repo">${escapeHtml(item.repository)}#${item.number}</span> <span aria-hidden="true">↗</span></a>
                <span class="contrib-meta">${escapeHtml(text('account.contributions.taskRef'))} #${item.issue} · L${item.difficulty} · +${item.points} XP</span>
              </div>
              <time datetime="${escapeHtml(item.at)}">${escapeHtml(formatDate(item.at))}</time>
            </li>
          `;
        }
        if (item.kind === 'recognition') {
          return `
            <li class="resume-contrib-item is-recognition">
              <div class="resume-contrib-main">
                <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.reason)} <span aria-hidden="true">↗</span></a>
                <span class="contrib-meta">${escapeHtml(text('account.contributions.recognition'))} · +${item.points} XP</span>
              </div>
              <time datetime="${escapeHtml(item.at)}">${escapeHtml(formatDate(item.at))}</time>
            </li>
          `;
        }
        return `
          <li class="resume-contrib-item">
            <div class="resume-contrib-main">
              <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)} <span aria-hidden="true">↗</span></a>
            </div>
            <time datetime="${escapeHtml(item.at)}">${escapeHtml(formatDate(item.at))}</time>
          </li>
        `;
      }).join('')}</ul></div>${pagerHtml('contrib', uiState.contribPage, contribPageCount)}`
    : `<div class="profile-panel-body"><p class="small muted profile-empty-slot">${escapeHtml(text('account.contributions.none'))}</p></div>`;

  const card3Html = `
    <section class="profile-panel">
      <h3 class="profile-panel-title"><span class="panel-rune" aria-hidden="true">◆</span>${escapeHtml(text('account.section.contributions'))}<span class="panel-count">${rawContributions.length}</span></h3>
      ${card3Inner}
    </section>
  `;

  // Card 4: Mentoring Others ("他指导别人")
  const mentorTabs = [
    {id: 'all', label: text('account.tasks.mentoredAll'), items: mentored},
    {id: 'completed', label: text('account.tasks.mentoredCompleted'), items: mentoredCompletedItems},
  ];
  const activeMentorTab = mentorTabs.find(tab => tab.id === uiState.mentorTab) || mentorTabs[0];
  const mentorEmptyMsg = mentored.length ? text('account.tasks.none') : text('account.tasks.noMentoring');
  const mentorProjectPill = mentoredProjectCount > 0
    ? `<span class="profile-panel-pill">${mentoredProjectCount} ${escapeHtml(text('account.mentoring.projects'))}</span>`
    : '';
  const card4Html = `
    <section class="profile-panel">
      <div class="profile-panel-head">
        <h3 class="profile-panel-title"><span class="panel-rune" aria-hidden="true">◆</span>${escapeHtml(text('account.section.mentoring'))}<span class="panel-count">${mentored.length}</span></h3>
        ${mentorProjectPill}
      </div>
      <div class="profile-tab-bar" role="tablist">
        ${mentorTabs.map(tab => `
          <button class="profile-tab${tab.id === activeMentorTab.id ? ' is-active' : ''}" type="button" role="tab" aria-selected="${tab.id === activeMentorTab.id}" data-mentor-tab="${tab.id}">
            <span>${escapeHtml(tab.label)}</span>
            <span class="profile-tab-count">${tab.items.length}</span>
          </button>
        `).join('')}
      </div>
      ${renderTaskLinksList(activeMentorTab.items, mentorEmptyMsg, uiState.mentorPage, 'mentoring', {showAssignee: true})}
    </section>
  `;

  const ghfindCardUrl = `https://ghfind.com/api/card/mini/${encodeURIComponent(u.login)}?variant=bars&theme=dark&lang=${lang}`;
  const ghfindProfileUrl = `https://ghfind.com/u/${encodeURIComponent(u.login)}`;

  const actionButtonsHtml = isOwnSession
    ? `
      <button class="account-small-btn is-accent" type="button" data-action="copy-link">${escapeHtml(text('account.copyLink'))}</button>
      <button class="account-small-btn" type="button" data-action="switch">${escapeHtml(text('account.switch'))}</button>
      <button class="account-small-btn" type="button" data-action="refresh">${escapeHtml(text('account.refresh'))}</button>
      <button class="account-small-btn is-danger" type="button" data-action="signout">${escapeHtml(text('account.signOut'))}</button>
    `
    : `<button class="account-small-btn is-accent" type="button" data-action="copy-link">${escapeHtml(text('account.copyLink'))}</button>`;

  profilePageContent.innerHTML = `
    <div class="account-hero-card has-ghfind">
      <div class="account-hero-main">
        <div class="account-identity">
          <div class="account-avatar-wrap">
            <img src="${escapeHtml(u.avatar_url)}" alt="" width="76" height="76">
            ${avatarRankCrest}
          </div>
          <div class="account-identity-copy">
            <div class="account-name-row">
              <strong>${escapeHtml(u.name || u.login)}</strong>
              <span class="account-login-handle">@${escapeHtml(u.login)}</span>
            </div>
            <div class="account-badges">${statusBadge}${levelBadge}${rolesHtml}</div>
            ${u.bio ? `<p class="account-bio">${escapeHtml(u.bio)}</p>` : ''}
          </div>
        </div>
        ${renderLevelBar(p)}
        ${heroMetricsHtml}
        <div class="account-hero-actions">${actionButtonsHtml}</div>
      </div>
      <aside class="account-hero-ghfind" aria-label="${escapeHtml(text('ghfind.title'))}">
        <div class="ghfind-panel-heading">
          <span class="ghfind-wordmark">ghfind <span aria-hidden="true">↗</span></span>
          <h3>${escapeHtml(text('ghfind.title'))}</h3>
        </div>
        <a class="ghfind-card-link" href="${escapeHtml(ghfindProfileUrl)}" target="_blank" rel="noopener noreferrer">
          <img src="${escapeHtml(ghfindCardUrl)}" alt="${escapeHtml(text('ghfind.cardAlt'))}" width="440" height="200" decoding="async" data-profile-ghfind-img>
          <span class="ghfind-image-fallback" hidden><span class="ghfind-wordmark">ghfind</span>${escapeHtml(text('ghfind.cardUnavailable'))}</span>
        </a>
      </aside>
    </div>
    <div class="profile-guild-divider" aria-hidden="true"><span>◆</span></div>
    <div class="profile-dashboard-grid">
      ${card1Html}
      ${card2Html}
      ${card3Html}
      ${card4Html}
    </div>
  `;

  const ghImg = profilePageContent.querySelector('[data-profile-ghfind-img]');
  if (ghImg) {
    const syncImgState = () => {
      const failed = ghImg.complete && ghImg.naturalWidth === 0;
      ghImg.hidden = failed;
      const fallback = ghImg.parentElement?.querySelector('.ghfind-image-fallback');
      if (fallback) fallback.hidden = !failed;
    };
    ghImg.addEventListener('load', syncImgState);
    ghImg.addEventListener('error', syncImgState);
    if (ghImg.complete) syncImgState();
  }

  profilePageContent.querySelectorAll('[data-task-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      uiState.taskTab = btn.getAttribute('data-task-tab');
      uiState.taskPage = 1;
      renderProfilePage();
    });
  });

  profilePageContent.querySelectorAll('[data-mentor-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      uiState.mentorTab = btn.getAttribute('data-mentor-tab');
      uiState.mentorPage = 1;
      renderProfilePage();
    });
  });

  profilePageContent.querySelectorAll('[data-pager]').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = btn.getAttribute('data-pager');
      const delta = Number(btn.getAttribute('data-delta') || 0);
      if (kind === 'tasks') uiState.taskPage = Math.max(1, uiState.taskPage + delta);
      else if (kind === 'mentoring') uiState.mentorPage = Math.max(1, uiState.mentorPage + delta);
      else if (kind === 'contrib') uiState.contribPage = Math.max(1, uiState.contribPage + delta);
      renderProfilePage();
    });
  });

  profilePageContent.querySelector('[data-action="copy-link"]')?.addEventListener('click', async btnEvent => {
    const btn = btnEvent.currentTarget;
    const shareUrl = new URL(getProfileUrl(u.login, Boolean(p)), location.href).href;
    try {
      await navigator.clipboard.writeText(shareUrl);
      btn.textContent = text('account.linkCopied');
      setTimeout(() => {btn.textContent = text('account.copyLink');}, 1800);
    } catch {}
  });
  profilePageContent.querySelector('[data-action="switch"]')?.addEventListener('click', () => openDialog());
  profilePageContent.querySelector('[data-action="signout"]')?.addEventListener('click', signOut);
  profilePageContent.querySelector('[data-action="refresh"]')?.addEventListener('click', async btnEvent => {
    const btn = btnEvent.currentTarget;
    btn.disabled = true;
    try {
      profileIndexCache = null;
      tasksDataCache = null;
      await signInByUsername(u.login, {forceRefresh: true, navigateToSlug: false});
    } finally {
      btn.disabled = false;
    }
  });
  profilePageContent.querySelector('[data-action="copy-snippet"]')?.addEventListener('click', async btnEvent => {
    const btn = btnEvent.currentTarget;
    const raw = profilePageContent.querySelector('[data-register-json]')?.textContent ?? '';
    try {
      await navigator.clipboard.writeText(raw);
      btn.textContent = text('account.copied');
      setTimeout(() => {btn.textContent = text('account.copySnippet');}, 1800);
    } catch {}
  });
}

function hydrateSessionFromCache(cached) {
  sessionState = {
    githubUser: cached.githubUser,
    mfcpProfile: cached.mfcpProfile ?? null,
    leaderboardCount: cached.leaderboardCount ?? initialLeaderboardCount,
    cachedAt: cached.cachedAt ?? null,
    myTasks: computeMyTasks(cached.githubUser, tasksDataCache ?? []),
  };
  updateHeaderTrigger();
  emitAccountChange();

  if (isProfilePage && !profileLogin) {
    const slug = cached.githubUser.login.toLowerCase();
    if (cached.mfcpProfile && !RESERVED_ROUTES.has(slug)) {
      location.replace(new URL(getProfileUrl(cached.githubUser.login, true), location.href).href);
      return;
    }
    viewState = {
      githubUser: sessionState.githubUser,
      mfcpProfile: sessionState.mfcpProfile,
      leaderboardCount: sessionState.leaderboardCount,
      myTasks: sessionState.myTasks,
    };
    renderProfilePage();
  }

  loadTasksData().then(tasks => {
    if (!sessionState.githubUser) return;
    sessionState.myTasks = computeMyTasks(sessionState.githubUser, tasks);
    emitAccountChange();
    if (isProfilePage && !profileLogin && viewState.githubUser?.login.toLowerCase() === sessionState.githubUser.login.toLowerCase()) {
      viewState.myTasks = sessionState.myTasks;
      renderProfilePage();
    }
  }).catch(() => {});
}

async function resolveProfileRecord(login, {skipGitHubApi = false} = {}) {
  const [profileIndex, tasks] = await Promise.all([
    loadProfileIndex().catch(() => null),
    loadTasksData().catch(() => []),
  ]);

  let mfcpProfile = profileIndex?.participants?.find(
    person => person.login.toLowerCase() === login.toLowerCase(),
  ) ?? null;

  let githubUser = null;
  if (!skipGitHubApi) {
    try {
      githubUser = await fetchPublicGitHubUser(mfcpProfile?.login || login);
      if (!mfcpProfile && profileIndex?.participants) {
        mfcpProfile = profileIndex.participants.find(person => person.id === githubUser.id) ?? null;
      }
    } catch (error) {
      if (!mfcpProfile) throw error;
    }
  }
  if (!githubUser && mfcpProfile) {
    githubUser = {
      id: mfcpProfile.id,
      login: mfcpProfile.login,
      name: mfcpProfile.login,
      avatar_url: mfcpProfile.avatarUrl,
      html_url: mfcpProfile.githubUrl,
    };
  }
  return {
    githubUser,
    mfcpProfile,
    leaderboardCount: profileIndex?.leaderboardCount ?? initialLeaderboardCount,
    myTasks: computeMyTasks(githubUser, tasks),
  };
}

async function signInByUsername(rawInput, {forceRefresh = false, navigateToSlug = false} = {}) {
  const login = rawInput.trim().replace(/^@+/, '');
  if (!login) {
    const err = new Error('EMPTY');
    err.code = 'EMPTY';
    throw err;
  }
  if (!USERNAME_RE.test(login)) {
    const err = new Error('INVALID_FORMAT');
    err.code = 'INVALID_FORMAT';
    throw err;
  }

  let resolved = null;
  if (!forceRefresh) {
    const cached = readCachedSession();
    if (cached && cached.githubUser.login.toLowerCase() === login.toLowerCase()) {
      resolved = {
        githubUser: cached.githubUser,
        mfcpProfile: cached.mfcpProfile ?? null,
        leaderboardCount: cached.leaderboardCount ?? initialLeaderboardCount,
        myTasks: computeMyTasks(cached.githubUser, await loadTasksData().catch(() => [])),
      };
    }
  }
  if (!resolved) {
    resolved = await resolveProfileRecord(login);
  }

  sessionState = {
    ...resolved,
    cachedAt: new Date().toISOString(),
  };
  saveCachedSession(sessionState);
  updateHeaderTrigger();
  emitAccountChange();

  const targetUrl = new URL(getProfileUrl(resolved.githubUser.login, Boolean(resolved.mfcpProfile)), location.href).href;
  if (navigateToSlug && location.href.split('#')[0] !== targetUrl) {
    location.assign(targetUrl);
    return;
  }

  if (isProfilePage) {
    uiState = {taskTab: null, taskPage: 1, mentorTab: 'all', mentorPage: 1, contribPage: 1};
    viewState = {
      githubUser: resolved.githubUser,
      mfcpProfile: resolved.mfcpProfile,
      leaderboardCount: resolved.leaderboardCount,
      myTasks: resolved.myTasks,
    };
    renderProfilePage();
  }
}

function signOut() {
  saveCachedSession(null);
  sessionState = {
    githubUser: null,
    mfcpProfile: null,
    leaderboardCount: initialLeaderboardCount,
    cachedAt: null,
    myTasks: {claimed: [], completed: [], mentored: []},
  };
  if (usernameInput) usernameInput.value = '';
  if (profileUsernameInput) profileUsernameInput.value = '';
  if (errorBox) errorBox.hidden = true;
  if (profileErrorBox) profileErrorBox.hidden = true;
  updateHeaderTrigger();
  if (isProfilePage) {
    if (!profileLogin) {
      viewState = {githubUser: null, mfcpProfile: null, leaderboardCount: initialLeaderboardCount, myTasks: {claimed: [], completed: [], mentored: []}};
    }
    renderProfilePage();
  }
  emitAccountChange();
}

function openDialog() {
  loadProfileIndex().catch(() => {});
  if (!dialog) return;
  if (errorBox) errorBox.hidden = true;
  if (usernameInput) usernameInput.value = sessionState.githubUser?.login ?? '';
  if (!dialog.open) dialog.showModal();
  usernameInput?.focus();
  usernameInput?.select();
}

function handleTriggerClick() {
  if (sessionState.githubUser) {
    const targetUrl = new URL(
      getProfileUrl(sessionState.githubUser.login, Boolean(sessionState.mfcpProfile)),
      location.href,
    ).href;
    if (location.href.split('#')[0] === targetUrl) {
      window.scrollTo({top: 0, behavior: 'smooth'});
      return;
    }
    location.assign(targetUrl);
    return;
  }
  if (isProfilePage && !profileLogin) {
    profileUsernameInput?.focus();
    return;
  }
  openDialog();
}

function bindUsernameForm({formEl, inputEl, errEl, btnEl, closeAfter = false}) {
  formEl?.addEventListener('submit', async event => {
    event.preventDefault();
    const raw = inputEl?.value ?? '';
    if (errEl) errEl.hidden = true;
    btnEl.disabled = true;
    const originalLabel = btnEl.textContent;
    btnEl.textContent = text('account.verifying');
    try {
      await signInByUsername(raw, {forceRefresh: true, navigateToSlug: true});
      if (closeAfter && dialog?.open) dialog.close();
    } catch (error) {
      if (errEl) {
        if (error.code === 'EMPTY') errEl.textContent = text('account.error.empty');
        else if (error.code === 'INVALID_FORMAT') errEl.textContent = text('account.error.invalidFormat');
        else if (error.code === 'NOT_FOUND') errEl.textContent = text('account.error.notFound');
        else if (error.code === 'RATE_LIMIT') errEl.textContent = text('account.error.rate');
        else errEl.textContent = text('account.error.network');
        errEl.hidden = false;
      }
      inputEl?.focus();
    } finally {
      btnEl.disabled = false;
      btnEl.textContent = originalLabel;
    }
  });
}

trigger?.addEventListener('click', handleTriggerClick);
closeBtn?.addEventListener('click', () => dialog?.close());
dialog?.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
});

bindUsernameForm({
  formEl: loginForm,
  inputEl: usernameInput,
  errEl: errorBox,
  btnEl: submitBtn,
  closeAfter: true,
});
bindUsernameForm({
  formEl: profileLoginForm,
  inputEl: profileUsernameInput,
  errEl: profileErrorBox,
  btnEl: profileSubmitBtn,
  closeAfter: false,
});

window.addEventListener('mfcp:language-change', () => {
  updateHeaderTrigger();
  renderProfilePage();
});

window.addEventListener('mfcp:tasks-updated', event => {
  const items = event.detail?.items;
  if (!Array.isArray(items)) return;
  tasksDataCache = items;
  if (sessionState.githubUser) {
    sessionState.myTasks = computeMyTasks(sessionState.githubUser, items);
    emitAccountChange();
  }
  if (isProfilePage && viewState.githubUser) {
    viewState.myTasks = computeMyTasks(viewState.githubUser, items);
    renderProfilePage();
  }
});

window.addEventListener('storage', event => {
  if (event.key !== SESSION_KEY) return;
  const cached = readCachedSession();
  if (cached) hydrateSessionFromCache(cached);
  else signOut();
});

window.__mfcpAccount = {
  openDialog,
  signOut,
  signInByUsername,
  getProfileUrl,
  getState: () => ({
    signedIn: Boolean(sessionState.githubUser),
    githubUser: sessionState.githubUser,
    mfcpProfile: sessionState.mfcpProfile,
    myTasks: sessionState.myTasks,
  }),
};

// 1. Restore visitor's own cached session synchronously (never calls api.github.com on load)
const cachedSession = readCachedSession();
if (cachedSession) {
  hydrateSessionFromCache(cachedSession);
} else {
  try {
    const legacy = localStorage.getItem(LEGACY_LOGIN_KEY)?.trim();
    if (legacy) signInByUsername(legacy).catch(() => {});
  } catch {}
}

// 2. If visiting a dedicated /<username>/ resume page, render immediately from pre-built data
if (isProfilePage) {
  loadProfileIndex().catch(() => {});
  if (profileLogin && profileData) {
    const matchesCached = cachedSession && cachedSession.githubUser.login.toLowerCase() === profileLogin.toLowerCase();
    const baseGithubUser = matchesCached ? cachedSession.githubUser : {
      id: profileData.id,
      login: profileData.login,
      name: profileData.login,
      avatar_url: profileData.avatarUrl,
      html_url: profileData.githubUrl,
    };
    viewState = {
      githubUser: baseGithubUser,
      mfcpProfile: profileData,
      leaderboardCount: initialLeaderboardCount,
      myTasks: {claimed: [], completed: [], mentored: []},
    };
    renderProfilePage();
    // Populate tasks from static tasks-data.json and enrich public GitHub bio/name if not cached
    loadTasksData().then(tasks => {
      viewState.myTasks = computeMyTasks(viewState.githubUser, tasks);
      renderProfilePage();
    }).catch(() => {});
    if (!matchesCached) {
      fetchPublicGitHubUser(profileData.login).then(publicUser => {
        viewState.githubUser = publicUser;
        renderProfilePage();
      }).catch(() => {});
    }
  } else {
    const queryUser = new URLSearchParams(location.search).get('user')?.trim();
    if (queryUser) {
      resolveProfileRecord(queryUser).then(resolved => {
        const slug = resolved.githubUser.login.toLowerCase();
        if (resolved.mfcpProfile && !RESERVED_ROUTES.has(slug)) {
          location.replace(new URL(getProfileUrl(resolved.githubUser.login, true), location.href).href);
          return;
        }
        viewState = resolved;
        renderProfilePage();
      }).catch(() => {});
    }
  }
}
