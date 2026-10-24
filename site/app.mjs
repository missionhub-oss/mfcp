// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
const {copy} = JSON.parse(document.getElementById('page-data').textContent);
const cards = [...document.querySelectorAll('.contributor-card')];
const search = document.getElementById('search');
const languageButton = document.getElementById('language');
const menuButton = document.getElementById('menu-toggle');
let language = 'zh';

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
  try {localStorage.setItem('mfcp.language', language);} catch {}
}

function filterContributors() {
  const query = search.value.trim().toLowerCase();
  let visible = 0;
  for (const card of cards) {
    card.hidden = !card.dataset.login.includes(query);
    if (!card.hidden) visible++;
  }
  document.getElementById('visible-count').textContent = visible;
  document.getElementById('people-empty').hidden = visible !== 0;
}

languageButton.addEventListener('click', () => setLanguage(language === 'en' ? 'zh' : 'en'));
search.addEventListener('input', filterContributors);
document.getElementById('clear-filters').addEventListener('click', () => {
  search.value = '';
  filterContributors();
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
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    menuButton.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('menu-open');
  }
});
try {language = localStorage.getItem('mfcp.language') === 'en' ? 'en' : 'zh';} catch {}
setLanguage(language);
document.documentElement.dataset.enhanced = 'true';

const art = document.querySelector('.forge-art');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
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

if (!reducedMotion.matches) {
  const revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  }, {threshold: 0.08});
  document.querySelectorAll('.hero-copy, #program .section-intro, .project-card, .ranking-heading, .contributor-card, .join-grid').forEach(element => {
    element.classList.add('reveal');
    revealObserver.observe(element);
  });
}
