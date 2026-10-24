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
