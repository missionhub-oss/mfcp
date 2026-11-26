// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
const cards = [...document.querySelectorAll('.job-card')];
const searchInput = document.getElementById('job-search');
const companyButtons = [...document.querySelectorAll('[data-job-company]')];
const industryButtons = [...document.querySelectorAll('[data-job-industry]')];
const resetButtons = [...document.querySelectorAll('[data-jobs-reset]')];
const visibleCount = document.getElementById('jobs-visible-count');
const filterEmpty = document.getElementById('jobs-filter-empty');
const resetInline = document.getElementById('jobs-reset-filters');
const mailtoLinks = [...document.querySelectorAll('a[data-mailto-zh][data-mailto-en]')];

const state = {
  company: 'all',
  industry: 'all',
  query: '',
};

function syncMailtoLinks(language) {
  const key = language === 'en' ? 'mailtoEn' : 'mailtoZh';
  for (const link of mailtoLinks) {
    const href = link.dataset[key];
    if (href) link.setAttribute('href', href);
  }
}

window.addEventListener('mfcp:language-change', event => {
  syncMailtoLinks(event.detail?.language);
});
syncMailtoLinks(document.documentElement.lang === 'en' ? 'en' : 'zh');

if (cards.length) {
  const validCompanies = new Set(companyButtons.map(btn => btn.dataset.jobCompany));
  const validIndustries = new Set(industryButtons.map(btn => btn.dataset.jobIndustry));

  const params = new URLSearchParams(location.search);
  const initialCompany = params.get('company');
  const initialIndustry = params.get('industry');
  const initialQuery = params.get('q');
  if (initialCompany && validCompanies.has(initialCompany)) state.company = initialCompany;
  if (initialIndustry && validIndustries.has(initialIndustry)) state.industry = initialIndustry;
  if (initialQuery) {
    state.query = initialQuery.trim();
    if (searchInput) searchInput.value = state.query;
  }

  function updateUrl() {
    const next = new URLSearchParams();
    if (state.company !== 'all') next.set('company', state.company);
    if (state.industry !== 'all') next.set('industry', state.industry);
    if (state.query) next.set('q', state.query);
    const qs = next.toString();
    const url = `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`;
    history.replaceState(null, '', url);
  }

  function render() {
    const q = state.query.toLowerCase();
    let shown = 0;
    for (const card of cards) {
      const matchCompany = state.company === 'all' || card.dataset.company === state.company;
      const matchIndustry = state.industry === 'all' || card.dataset.industry === state.industry;
      const matchQuery = !q || (card.dataset.search || '').includes(q);
      const visible = matchCompany && matchIndustry && matchQuery;
      card.hidden = !visible;
      if (visible) shown += 1;
    }
    for (const btn of companyButtons) {
      const active = btn.dataset.jobCompany === state.company;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    }
    for (const btn of industryButtons) {
      const active = btn.dataset.jobIndustry === state.industry;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    }
    const filtered = state.company !== 'all' || state.industry !== 'all' || Boolean(state.query);
    if (visibleCount) visibleCount.textContent = String(shown);
    if (filterEmpty) filterEmpty.hidden = shown !== 0;
    if (resetInline) resetInline.hidden = !filtered;
  }

  for (const btn of companyButtons) {
    btn.addEventListener('click', () => {
      state.company = btn.dataset.jobCompany;
      render();
      updateUrl();
    });
  }
  for (const btn of industryButtons) {
    btn.addEventListener('click', () => {
      state.industry = btn.dataset.jobIndustry;
      render();
      updateUrl();
    });
  }
  searchInput?.addEventListener('input', () => {
    state.query = searchInput.value.trim();
    render();
    updateUrl();
  });
  for (const btn of resetButtons) {
    btn.addEventListener('click', () => {
      state.company = 'all';
      state.industry = 'all';
      state.query = '';
      if (searchInput) searchInput.value = '';
      render();
      updateUrl();
    });
  }

  render();
}
