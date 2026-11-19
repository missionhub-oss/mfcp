// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, mkdtemp, readFile, rm, access} from 'node:fs/promises';
import {join} from 'node:path';
import {load} from 'cheerio';
import {buildPages} from '../scripts/build-pages.mjs';
import {loadTaskIssues} from '../scripts/lib/task-stats.mjs';
import {classifyTaskStatus, extractProjects, extractMentors, renderTaskBody} from '../scripts/lib/tasks.mjs';

test('task parser classifies status, resolves project and mentor fallbacks, and sanitizes issue HTML', () => {
  assert.equal(classifyTaskStatus({state: 'open', state_reason: null, assignees: []}), 'available');
  assert.equal(classifyTaskStatus({state: 'open', state_reason: null, assignees: [{id: 1}]}), 'claimed');
  assert.equal(classifyTaskStatus({state: 'closed', state_reason: 'completed', assignees: [{id: 1}]}), 'completed');
  assert.equal(classifyTaskStatus({state: 'closed', state_reason: 'not_planned', assignees: []}), 'closed');

  assert.deepEqual(extractProjects({
    labels: [{name: 'difficulty/level1'}, {name: '2026'}],
    body: '### Project / 实践项目\n\nZephyr\n\n### Background / 问题背景\n\nDetails.',
  }), ['zephyr']);

  assert.deepEqual(extractMentors(
    '### Mentor / 导师\n\n<!-- mfcp-mentor:start -->\n\nMentor: [@zevorn](https://github.com/zevorn)\n\n<!-- mfcp-mentor-command: "https://example.com" -->\n\n<!-- mfcp-mentor:end -->',
  ), ['zevorn']);

  const safe = renderTaskBody('Hello [link](https://example.com) <script>alert(1)</script><a href="javascript:alert(2)" onclick="evil()">bad</a>');
  assert.doesNotMatch(safe, /<script|onclick|javascript:/i);
  assert.match(safe, /target="_blank"/);
  assert.match(safe, /rel="noopener noreferrer"/);
});

test('Task Plaza and profile index build from real GitHub Task issues and repository records', async () => {
  await mkdir('.mfcp-runtime', {recursive: true});
  const output = await mkdtemp('.mfcp-runtime/tasks-plaza-');
  try {
    const issues = await loadTaskIssues();
    const {program} = await buildPages('.', {output, issues});

    const taskHtml = await readFile(join(output, 'tasks/index.html'), 'utf8');
    const $ = load(taskHtml);
    const data = JSON.parse(await readFile(join(output, 'tasks/tasks-data.json'), 'utf8'));
    const profileIndex = JSON.parse(await readFile(join(output, 'profile-index.json'), 'utf8'));

    assert.equal($('h1').length, 1);
    assert.equal($('link[rel="canonical"]').attr('href'), 'https://missionhub-oss.github.io/mfcp/tasks/');
    assert.equal($('#main-nav a.nav-tasks-cta').attr('aria-current'), 'page');
    assert.equal($('#main-nav a.nav-tasks-cta').attr('href'), '../tasks/');
    assert.equal(Number($('#main-nav a.nav-tasks-cta .nav-tasks-count').text()), data.stats.available);

    assert.equal(data.items.length, program.stats.tasks);
    assert.equal(data.stats.claimed, program.stats.inProgressTasks);
    assert.equal(data.stats.completed, program.stats.completedTasks);
    assert.equal(data.stats.available + data.stats.claimed + data.stats.completed + data.stats.closed, data.stats.total);
    assert.equal($('.task-card').length, data.items.length);
    assert.deepEqual(data.facets.levels, [1, 2, 3, 4]);
    assert.deepEqual(
      $('#level-filter-group [data-level]').map((_, el) => $(el).text().trim()).get(),
      ['全部等级', 'L1', 'L2', 'L3', 'L4'],
    );
    $('.task-card .pill-level').each((_, el) => {
      assert.doesNotMatch($(el).text(), /XP/);
    });
    assert.equal($('.task-card-summary, .quest-objectives').length, 0);
    assert.ok($('.task-person-chip.is-mentor img[src]').length > 0);

    // Every real task issue should resolve at least one project (via label or body section)
    for (const item of data.items) {
      assert.ok(item.projects.length > 0, `Task #${item.number} is missing resolved project`);
      assert.ok(item.year !== null, `Task #${item.number} is missing year`);
      assert.equal(item.mentorDetails.length, item.mentors.length);
      for (const mentor of item.mentorDetails) assert.match(mentor.avatarUrl, /^https:\/\/(?:avatars\.githubusercontent\.com|github\.com)\//);
      assert.doesNotMatch(item.summary, /https?:\/\//i);
      assert.ok(Array.isArray(item.objectives) && item.objectives.length <= 2);
      for (const obj of item.objectives) assert.doesNotMatch(obj, /https?:\/\//i);
      assert.doesNotMatch(item.bodyHtml, /<script|<iframe|onclick=/i);
    }

    // Verify all i18n keys on tasks page exist in both languages and start in Chinese
    const {copy} = JSON.parse($('#page-data').text());
    for (const attribute of ['data-i18n', 'data-i18n-placeholder', 'data-i18n-aria-label', 'data-i18n-alt']) {
      $(`[${attribute}]`).each((_, element) => {
        const key = $(element).attr(attribute);
        assert.ok(copy[key]?.en && copy[key]?.zh, `Missing Task Plaza bilingual content: ${key}`);
        const rendered = attribute === 'data-i18n' ? $(element).text() : $(element).attr(attribute.slice('data-i18n-'.length));
        assert.equal(rendered, copy[key].zh, `Incorrect initial language on tasks page: ${key}`);
      });
    }

    // Verify all assets linked from tasks/index.html exist
    for (const element of $('script[src], link[rel="stylesheet"]').toArray()) {
      const path = $(element).attr('src') ?? $(element).attr('href');
      await access(join(output, 'tasks', path.split('?')[0]));
    }

    // Verify profile-index includes all registered participants (including L4) and governance roles
    assert.equal(profileIndex.participants.length, program.participants.length);
    const zevorn = profileIndex.participants.find(person => person.login.toLowerCase() === 'zevorn');
    assert.ok(zevorn, 'Expected L4 participant zevorn in profile-index.json');
    assert.equal(zevorn.level, 4);
    assert.ok(zevorn.roles.includes('maintainer'));
    assert.ok(zevorn.roles.includes('mentor'));
    assert.ok(zevorn.recognitions.length > 0);
    assert.ok(zevorn.mentoring.total >= zevorn.mentoring.completed);
    assert.ok(zevorn.mentoring.completed > 0);
    assert.ok(zevorn.mentoring.projectCount > 0);
    assert.ok(Array.isArray(zevorn.projects) && zevorn.projects.length > 0);
    assert.ok(Array.isArray(zevorn.contributionsList) && zevorn.contributionsList.length > 0);

    // Verify per-contributor static open-source resume pages (/<username>/)
    await access(join(output, '404.html'));
    for (const slug of ['zevorn', 'asymecat']) {
      const person = profileIndex.participants.find(item => item.login.toLowerCase() === slug);
      assert.ok(person, `Expected participant ${slug}`);
      const resumePage = load(await readFile(join(output, slug, 'index.html'), 'utf8'));
      assert.equal(resumePage('h1').text().trim(), '开源履历。');
      assert.equal(resumePage('link[rel="canonical"]').attr('href'), `https://missionhub-oss.github.io/mfcp/${slug}/`);
      assert.equal(resumePage('#profile-page-signin').is('[hidden]'), true);
      assert.equal(resumePage('#profile-page-dashboard').is('[hidden]'), false);
      const resumePayload = JSON.parse(resumePage('#page-data').text());
      assert.equal(resumePayload.profileLogin, person.login);
      assert.equal(resumePayload.profileData.id, person.id);
      assert.equal(resumePayload.leaderboardCount, program.leaderboard.length);
      for (const attribute of ['data-i18n', 'data-i18n-placeholder', 'data-i18n-aria-label', 'data-i18n-alt']) {
        resumePage(`[${attribute}]`).each((_, element) => {
          const key = resumePage(element).attr(attribute);
          assert.ok(resumePayload.copy[key]?.en && resumePayload.copy[key]?.zh, `Missing resume bilingual content: ${key}`);
          const rendered = attribute === 'data-i18n' ? resumePage(element).text() : resumePage(element).attr(attribute.slice('data-i18n-'.length));
          assert.equal(rendered, resumePayload.copy[key].zh, `Incorrect initial resume language: ${key}`);
        });
      }
      for (const element of resumePage('script[src], link[rel="stylesheet"]').toArray()) {
        const path = resumePage(element).attr('href') ?? resumePage(element).attr('src');
        await access(join(output, slug, path.split('?')[0]));
      }
    }

    // Verify dedicated profile page builds cleanly
    const profilePage = load(await readFile(join(output, 'profile/index.html'), 'utf8'));
    assert.equal(profilePage('h1').length, 1);
    assert.equal(profilePage('link[rel="canonical"]').attr('href'), 'https://missionhub-oss.github.io/mfcp/profile/');
    assert.equal(profilePage('#account-trigger').attr('aria-current'), 'page');
    assert.equal(profilePage('.header-actions .github-star-link').length, 0);
    const profileCopy = JSON.parse(profilePage('#page-data').text()).copy;
    for (const attribute of ['data-i18n', 'data-i18n-placeholder', 'data-i18n-aria-label', 'data-i18n-alt']) {
      profilePage(`[${attribute}]`).each((_, element) => {
        const key = profilePage(element).attr(attribute);
        assert.ok(profileCopy[key]?.en && profileCopy[key]?.zh, `Missing profile bilingual content: ${key}`);
        const rendered = attribute === 'data-i18n' ? profilePage(element).text() : profilePage(element).attr(attribute.slice('data-i18n-'.length));
        assert.equal(rendered, profileCopy[key].zh, `Incorrect initial profile language: ${key}`);
      });
    }
    for (const element of profilePage('script[src], link[rel="stylesheet"]').toArray()) {
      const path = profilePage(element).attr('href') ?? profilePage(element).attr('src');
      await access(join(output, 'profile', path.split('?')[0]));
    }
    assert.equal(profilePage('#profile-username-input').length, 1);
    assert.equal(profilePage('#github-username-input').length, 1);
  } finally {
    await rm(output, {recursive: true, force: true});
  }
});
