// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
const {copy} = JSON.parse(document.getElementById('page-data').textContent);
const carousel = document.querySelector('[data-event-carousel]');

if (carousel) {
  const slides = [...carousel.querySelectorAll('[data-event-slide]')];
  const pagination = document.getElementById('event-pagination');
  const previous = document.getElementById('event-previous');
  const next = document.getElementById('event-next');
  const status = document.getElementById('event-status');

  if (slides.length > 1 && pagination && previous && next && status) {
    let group = 0;

    const render = () => {
      slides.forEach((slide, index) => {
        slide.classList.toggle('is-active', index === group);
      });
      previous.disabled = group === 0;
      next.disabled = group === slides.length - 1;
      const lang = document.documentElement.lang === 'en' ? 'en' : 'zh';
      const template = copy['events.groupStatus']?.[lang] ?? '';
      status.textContent = template
        .replace('{current}', String(group + 1))
        .replace('{total}', String(slides.length));
    };

    pagination.hidden = false;
    previous.addEventListener('click', () => {
      if (group === 0) return;
      group -= 1;
      render();
    });
    next.addEventListener('click', () => {
      if (group === slides.length - 1) return;
      group += 1;
      render();
    });
    window.addEventListener('mfcp:language-change', render);
    render();
  }
}
