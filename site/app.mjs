// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
const {copy} = JSON.parse(document.getElementById('page-data').textContent);
const cards = [...document.querySelectorAll('.contributor-card')];
const search = document.getElementById('search');
const languageButton = document.getElementById('language');
const themeButton = document.getElementById('theme-toggle');
const menuButton = document.getElementById('menu-toggle');
const previousPage = document.getElementById('previous-page');
const nextPage = document.getElementById('next-page');
const leaderboardTabs = [...document.querySelectorAll('[data-leaderboard-tab]')];
const leaderboardPanels = [...document.querySelectorAll('[data-leaderboard-panel]')];
const initialLeaderboardTab = location.hash === '#hall' ? 'hall' : 'ranking';
const pageSize = 10;
let currentPage = 1;
let language = 'zh';
let theme = 'dark';
const lightSchemeQuery = matchMedia('(prefers-color-scheme: light)');

function setTheme(next, persist = false) {
  theme = next === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.content = theme === 'light' ? '#eeece1' : '#111111';
  if (themeButton) {
    const labelKey = theme === 'light' ? 'a11y.themeDark' : 'a11y.themeLight';
    themeButton.setAttribute('aria-pressed', String(theme === 'light'));
    themeButton.setAttribute('data-i18n-aria-label', labelKey);
    if (copy[labelKey]) themeButton.setAttribute('aria-label', copy[labelKey][language]);
  }
  if (persist) {
    try {localStorage.setItem('mfcp.theme', theme);} catch {}
  }
}

function setLeaderboardTab(tab) {
  if (!leaderboardTabs.length) return;
  for (const button of leaderboardTabs) {
    const active = button.dataset.leaderboardTab === tab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  }
  for (const panel of leaderboardPanels) {
    const active = panel.dataset.leaderboardPanel === tab;
    panel.classList.toggle('is-active', active);
    panel.hidden = !active;
  }
  if (tab === 'ranking') renderContributors();
}

function handleLegacyFragments() {
  if (document.body.dataset.page === 'home') {
    if (location.hash === '#events') {
      location.replace(new URL('events/', location.href));
      return;
    }
    if (location.hash === '#leaderboard') {
      location.replace(new URL('leaderboard/', location.href));
      return;
    }
    if (location.hash.startsWith('#contributor-')) {
      location.replace(new URL(`leaderboard/${location.hash}`, location.href));
      return;
    }
  }
  if (document.body.dataset.page === 'leaderboard' && location.hash === '#hall') {
    setLeaderboardTab('hall');
    return;
  }
  if (document.body.dataset.page === 'leaderboard' && location.hash === '#ranking') {
    setLeaderboardTab('ranking');
    return;
  }
  if (document.body.dataset.page === 'leaderboard' && location.hash.startsWith('#contributor-')) {
    setLeaderboardTab('ranking');
    const login = decodeURIComponent(location.hash.slice('#contributor-'.length)).toLowerCase();
    const index = cards.findIndex(card => card.dataset.login === login);
    if (index >= 0) {
      if (search) search.value = '';
      currentPage = Math.floor(index / pageSize) + 1;
      renderContributors();
      const targetCard = cards[index];
      const details = targetCard.querySelector('details');
      if (details) details.open = true;
      targetCard.scrollIntoView({block: 'center'});
    }
  }
}
window.addEventListener('hashchange', handleLegacyFragments);

function setLanguage(next) {
  language = next === 'en' ? 'en' : 'zh';
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const value = copy[element.dataset.i18n]?.[language];
    if (value !== undefined) element.textContent = value;
  });
  for (const attribute of ['placeholder', 'aria-label', 'alt']) {
    document.querySelectorAll(`[data-i18n-${attribute}]`).forEach(element => {
      const key = element.getAttribute(`data-i18n-${attribute}`);
      if (copy[key]) element.setAttribute(attribute, copy[key][language]);
    });
  }
  document.querySelectorAll('[data-en][data-zh]').forEach(element => {element.textContent = element.dataset[language];});
  const date = new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en', {year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'});
  document.querySelectorAll('[data-date]').forEach(element => {element.textContent = date.format(new Date(element.dataset.date));});
  document.title = copy['meta.title'][language];
  document.querySelector('meta[name="description"]').content = copy['meta.description'][language];
  languageButton.textContent = language === 'en' ? '中文' : 'English';
  document.querySelectorAll('[data-ghfind-image]').forEach(img => {
    const url = new URL(img.src);
    if (url.searchParams.get('lang') === language) return;
    url.searchParams.set('lang', language);
    img.hidden = false;
    img.parentElement.querySelector('.ghfind-image-fallback').hidden = true;
    img.src = url.href;
  });
  try {localStorage.setItem('mfcp.language', language);} catch {}
  renderContributors();
  window.dispatchEvent(new CustomEvent('mfcp:language-change', {detail: {language}}));
}

function renderContributors() {
  if (!search) return;
  const query = search.value.trim().toLowerCase();
  const matches = cards.filter(card => card.dataset.login.includes(query));
  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
  currentPage = Math.min(currentPage, pageCount);
  const visible = new Set(matches.slice((currentPage - 1) * pageSize, currentPage * pageSize));
  for (const card of cards) card.hidden = !visible.has(card);
  document.getElementById('visible-count').textContent = matches.length;
  document.getElementById('people-empty').hidden = matches.length !== 0;
  document.getElementById('pagination').hidden = pageCount <= 1;
  document.getElementById('pagination-status').textContent = language === 'zh'
    ? `第 ${currentPage} / ${pageCount} 页` : `Page ${currentPage} of ${pageCount}`;
  previousPage.disabled = currentPage === 1;
  nextPage.disabled = currentPage === pageCount;
}

function changePage(delta) {
  currentPage = Math.max(1, currentPage + delta);
  renderContributors();
  document.getElementById('ranking-title').focus({preventScroll: true});
  document.getElementById('leaderboard').scrollIntoView({block: 'start'});
}

for (const button of leaderboardTabs) {
  button.addEventListener('click', () => {
    const tab = button.dataset.leaderboardTab;
    setLeaderboardTab(tab);
    const url = new URL(location.href);
    url.hash = tab === 'hall' ? 'hall' : 'ranking';
    history.replaceState(null, '', url);
  });
  button.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const index = leaderboardTabs.indexOf(button);
    const next = leaderboardTabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + leaderboardTabs.length) % leaderboardTabs.length];
    next.focus();
    next.click();
  });
}
languageButton.addEventListener('click', () => setLanguage(language === 'en' ? 'zh' : 'en'));
themeButton?.addEventListener('click', () => setTheme(theme === 'light' ? 'dark' : 'light', true));
lightSchemeQuery.addEventListener('change', event => {
  try {
    if (localStorage.getItem('mfcp.theme')) return;
  } catch {}
  setTheme(event.matches ? 'light' : 'dark');
});
search?.addEventListener('input', () => {
  currentPage = 1;
  renderContributors();
});
previousPage?.addEventListener('click', () => changePage(-1));
nextPage?.addEventListener('click', () => changePage(1));
document.getElementById('clear-filters')?.addEventListener('click', () => {
  search.value = '';
  currentPage = 1;
  renderContributors();
  search.focus();
});
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  document.documentElement.classList.toggle('menu-open', open);
});
document.querySelectorAll('#main-nav a').forEach(link => link.addEventListener('click', () => {
  menuButton.setAttribute('aria-expanded', 'false');
  document.documentElement.classList.remove('menu-open');
}));
document.querySelectorAll('.avatar img').forEach(img => img.addEventListener('error', () => {img.hidden = true;}));
document.querySelectorAll('[data-ghfind-image]').forEach(img => {
  const updateImage = () => {
    const failed = img.complete && img.naturalWidth === 0;
    img.hidden = failed;
    img.parentElement.querySelector('.ghfind-image-fallback').hidden = !failed;
  };
  img.addEventListener('load', updateImage);
  img.addEventListener('error', updateImage);
  if (img.complete) updateImage();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    menuButton.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('menu-open');
  }
});
try {language = localStorage.getItem('mfcp.language') === 'en' ? 'en' : 'zh';} catch {}
try {
  const savedTheme = localStorage.getItem('mfcp.theme');
  theme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : (lightSchemeQuery.matches ? 'light' : 'dark');
} catch {}
setTheme(theme);
setLanguage(language);
setLeaderboardTab(initialLeaderboardTab);
handleLegacyFragments();
document.documentElement.dataset.enhanced = 'true';

const art = document.querySelector('.forge-art');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
if (art) {
  let artVisible = true;
  let pointerFrame = null;
  let pointerX = 0;
  let pointerY = 0;
  function resetTilt() {
    if (pointerFrame !== null) cancelAnimationFrame(pointerFrame);
    pointerFrame = null;
    art.style.removeProperty('--tilt-x');
    art.style.removeProperty('--tilt-y');
  }
  function updateMotion() {
    const paused = document.hidden || !artVisible || reducedMotion.matches;
    art.classList.toggle('motion-paused', paused);
    if (paused) resetTilt();
  }
  new IntersectionObserver(([entry]) => {
    artVisible = entry.isIntersecting;
    updateMotion();
  }).observe(art);
  document.addEventListener('visibilitychange', updateMotion);
  reducedMotion.addEventListener('change', updateMotion);
  art.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || reducedMotion.matches || !artVisible) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (pointerFrame !== null) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = null;
      const bounds = art.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (pointerX - bounds.left) / bounds.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (pointerY - bounds.top) / bounds.height * 2 - 1));
      art.style.setProperty('--tilt-x', `${(-y * 4).toFixed(2)}deg`);
      art.style.setProperty('--tilt-y', `${(x * 4).toFixed(2)}deg`);
    });
  });
  art.addEventListener('pointerleave', resetTilt);
  art.addEventListener('pointercancel', resetTilt);
  updateMotion();
}

if (!reducedMotion.matches) {
  const revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  }, {threshold: 0.08});
  document.querySelectorAll('.hero-copy, #program .section-intro, .project-card, .ranking-heading, .contributor-card, .partner-link, .join-grid').forEach(element => {
    element.classList.add('reveal');
    revealObserver.observe(element);
  });
}

const lightbox = document.getElementById('blog-lightbox');
if (lightbox) {
  const lightboxImage = document.getElementById('blog-lightbox-image');
  const lightboxCaption = document.getElementById('blog-lightbox-caption');
  const closeButton = document.getElementById('blog-lightbox-close');
  document.querySelectorAll('.blog-body .blog-media img').forEach(img => {
    img.addEventListener('click', () => {
      lightboxImage.src = img.currentSrc || img.src;
      lightboxImage.alt = img.alt;
      if (lightboxCaption) lightboxCaption.textContent = '';
      lightbox.showModal();
    });
  });
  closeButton?.addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', event => {
    if (event.target === lightbox) lightbox.close();
  });
}

const tocSidebar = document.querySelector('.blog-toc-sidebar, .job-toc-sidebar');
if (tocSidebar) {
  const tocLinks = [...tocSidebar.querySelectorAll('a[href^="#"]')];
  const linkById = new Map(tocLinks.map(link => [link.getAttribute('href').slice(1), link]));
  const headings = [...document.querySelectorAll('.blog-body h2[id], .job-body h2[id]')];
  const updateActiveToc = () => {
    const activeLang = document.documentElement.lang === 'en' ? 'en' : 'zh';
    const visibleHeadings = headings.filter(h => {
      const block = h.closest('[data-lang-block]');
      return !block || block.dataset.langBlock === activeLang;
    });
    let current = visibleHeadings[0]?.id;
    for (const heading of visibleHeadings) {
      if (heading.getBoundingClientRect().top <= 140) current = heading.id;
    }
    for (const link of tocLinks) link.classList.toggle('is-active', link === linkById.get(current));
  };
  window.addEventListener('scroll', updateActiveToc, {passive: true});
  languageButton?.addEventListener('click', () => requestAnimationFrame(updateActiveToc));
  updateActiveToc();
}
