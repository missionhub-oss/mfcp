// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, mkdtemp, cp, readFile, readdir, rm, access} from 'node:fs/promises';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {load} from 'cheerio';
import {buildPages} from '../scripts/build-pages.mjs';
import {normalizeProfile, totals} from '../scripts/lib/profile.mjs';
import {loadTaskIssues} from '../scripts/lib/task-stats.mjs';
import {loadCommunity} from '../scripts/lib/community.mjs';
import {loadEvents} from '../scripts/lib/events.mjs';

test('trusted site rendering publishes real records from a separate data directory', async () => {
  await mkdir('.mfcp-runtime', {recursive: true});
  const directory = await mkdtemp('.mfcp-runtime/pages-');
  try {
    for (const name of ['participants', 'programs']) await cp(name, join(directory, name), {recursive: true});
    await assert.rejects(access(join(directory, 'site')), {code: 'ENOENT'});
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
    const issues = await loadTaskIssues();
    const {html, program, output} = await buildPages(directory, {sha, issues});
    const $ = load(html);
    const events = await loadEvents();
    const eventPage = load(await readFile(join(output, 'events/index.html'), 'utf8'));
    const leaderboardPage = load(await readFile(join(output, 'leaderboard/index.html'), 'utf8'));
    assert.equal(eventPage('.event-card').length, events.replays.length);
    assert.deepEqual(eventPage('.event-title-link').map((_, element) => eventPage(element).attr('href')).get(), events.replays.map(replay => replay.url));
    assert.deepEqual(eventPage('.event-card time').map((_, element) => eventPage(element).attr('datetime')).get(), events.replays.map(replay => replay.date));
    assert.equal(eventPage('.event-slide').length, Math.ceil(events.replays.length / 6));
    assert.equal(eventPage('.event-slide').first().find('.event-card').length, Math.min(6, events.replays.length));
    assert.equal(eventPage('.event-slide').first().hasClass('is-active'), true);
    assert.equal(eventPage('.event-slide.is-active').length, 1);
    assert.equal(eventPage('#event-pagination').is('[hidden]'), true);
    assert.equal(eventPage('#event-previous').is('[disabled]'), true);
    assert.deepEqual(eventPage('.event-slides').map((_, element) => eventPage(element).attr('href')).get(),
      events.replays.filter(replay => replay.slides).map(replay => `../${replay.slides}`));
    assert.equal(eventPage('h1').length, 1);
    assert.equal(eventPage('link[rel="canonical"]').attr('href'), 'https://missionhub-oss.github.io/mfcp/events/');
    assert.equal(eventPage('#main-nav a[aria-current="page"]').attr('href'), '../events/');
    assert.equal(eventPage('#main-nav a[target]').length, 0);
    assert.equal(eventPage('#main-nav a.nav-tasks-cta').attr('href'), '../tasks/');
    assert.equal($('#main-nav a[href="leaderboard/"]').length, 1);
    assert.equal($('#main-nav a[href="jobs/"]').length, 1);
    assert.equal($('#main-nav a[href="events/"]').length, 1);
    assert.deepEqual($('#main-nav a').slice(0, 3).map((_, element) => ({
      href: $(element).attr('href'),
      text: $(element).text().trim(),
    })).get(), [
      {href: 'leaderboard/', text: '名人堂'},
      {href: 'jobs/', text: '招聘'},
      {href: 'events/', text: '活动'},
    ]);
    assert.equal($('#main-nav a[href="https://missionhub-oss.github.io/website/"]').text().trim(), '社区门户');
    assert.equal($('#main-nav a.nav-tasks-cta').attr('href'), 'tasks/');
    assert.equal($('#main-nav a[target]').length, 0);
    assert.equal($('#main-nav a[href*="feishu.cn"]').length, 0);
    assert.equal($('#main-nav a[href$="#program"]').length, 0);
    assert.equal($('.header-actions .github-star-link').length, 0);
    assert.equal($('#leaderboard, .contributor-card').length, 0);
    assert.equal($('#events, [role="tablist"], [role="tabpanel"]').length, 0);
    assert.equal(leaderboardPage('h1').length, 1);
    assert.equal(leaderboardPage('link[rel="canonical"]').attr('href'), 'https://missionhub-oss.github.io/mfcp/leaderboard/');
    assert.equal(leaderboardPage('#main-nav a[aria-current="page"]').attr('href'), '../leaderboard/');
    assert.equal(leaderboardPage('#main-nav a[aria-current="page"]').text().trim(), '名人堂');
    assert.equal(leaderboardPage('#hall-title').text().trim(), '名人堂。');
    assert.equal(leaderboardPage('#hall-of-fame').hasClass('is-active'), false);
    assert.equal(leaderboardPage('#leaderboard').hasClass('is-active'), true);
    assert.equal(leaderboardPage('.hall-tab[aria-selected="true"]').text().trim(), '排行榜');
    assert.equal(leaderboardPage('.ambassador-card').length, 4);
    assert.deepEqual(leaderboardPage('.ambassador-photo').map((_, element) => leaderboardPage(element).attr('src')).get(),
      ['../assets/ambassadors/luojia65.jpg', '../assets/ambassadors/kunyuanxu-star.jpg', '../assets/ambassadors/lianux-mm.jpg',
        '../assets/ambassadors/IxaKylin.jpg']);
    assert.deepEqual(leaderboardPage('.ambassador-body h2').map((_, element) => leaderboardPage(element).text().trim()).get(),
      ['蒋周奇（洛佳）', '徐堃元', '王炼', '杨伟鹏']);
    assert.deepEqual(leaderboardPage('.ambassador-tag').map((_, element) => leaderboardPage(element).text().trim()).get(),
      ['开源大使', '宣传大使', '开源大使', '宣传大使']);
    assert.deepEqual(leaderboardPage('.ambassador-media').map((_, element) => leaderboardPage(element).attr('href')).get(),
      ['https://github.com/luojia65', 'https://www.zhihu.com/people/luojia-14-40', 'https://github.com/kunyuanxu-star',
        'https://github.com/lianux-mm', 'https://github.com/IxaKylin']);
    assert.equal(leaderboardPage('.hall-empty').length, 0);
    assert.equal(leaderboardPage('.hall-apply').text().trim(), '申请成为大使 ↗');
    assert.equal(leaderboardPage('.hall-apply').next().length, 0);
    assert.equal(leaderboardPage('#leaderboard').attr('aria-labelledby'), 'ranking-title');
    assert.equal(leaderboardPage('#ranking-title').length, 1);
    const profiles = await Promise.all((await readdir('participants')).filter(file => file.endsWith('.json')).map(async file =>
      normalizeProfile(JSON.parse(await readFile(join('participants', file), 'utf8')), `participants/${file}`)));
    const rankedProfiles = profiles.filter(profile => profile.level < 4);
    assert.equal(leaderboardPage('.ranking-list>.contributor-card').length, rankedProfiles.length);
    assert.equal(leaderboardPage('.recognized-card').length, 0);
    assert.deepEqual(leaderboardPage('.ranking-list>.contributor-card').map((_, element) => leaderboardPage(element).attr('data-login')).get(),
      program.leaderboard.map(person => person.login.toLowerCase()));
    for (const profile of profiles.filter(profile => profile.level === 4)) {
      assert.equal(leaderboardPage(`#contributor-${profile.github_login.toLowerCase()}`).length, 0);
    }
    const tasks = issues.filter(issue => !issue.pull_request && issue.type?.name === 'Task');
    const inProgress = tasks.filter(issue => issue.state === 'open' && issue.assignees.length > 0);
    const completed = tasks.filter(issue => issue.state === 'closed' && issue.state_reason === 'completed');
    assert.equal(program.stats.tasks, tasks.length);
    assert.equal(program.stats.inProgressTasks, inProgress.length);
    assert.equal(program.stats.completedTasks, completed.length);
    const community = await loadCommunity();
    assert.deepEqual($('.stats-grid>a').map((_, element) => ({
      label: $(element).children('span').text(), value: $(element).find('strong').text().trim(),
    })).get(), [
      {label: '社群人数', value: `${community.members}${community.approximate ? '+' : ''}`},
      {label: '贡献者', value: String(profiles.length)},
      {label: '任务总数', value: String(tasks.length)},
      {label: '进行中', value: String(inProgress.length)},
    ]);
    assert.deepEqual($('.stats-grid>a').map((_, element) => $(element).attr('href')).get(), [
      '#join',
      'leaderboard/',
      'tasks/',
      'tasks/?status=claimed',
    ]);
    assert.equal(program.stats.experience, profiles.reduce((sum, profile) => sum + totals(profile).experience, 0));
    for (const profile of rankedProfiles) {
      const person = program.participants.find(item => item.id === profile.github_id);
      assert.deepEqual(person.stats, totals(profile));
      const card = leaderboardPage(`#contributor-${profile.github_login.toLowerCase()}`);
      assert.equal(card.attr('data-level'), String(profile.level));
      assert.equal(card.attr('data-xp'), String(person.stats.experience));
      assert.deepEqual(card.find('.person-stats dd').map((_, element) => Number(leaderboardPage(element).text())).get(),
        [person.stats.experience, person.stats.tasks, person.stats.pull_requests]);
      assert.equal(card.find('.rank-tasks strong').text(), String(person.stats.tasks));
      assert.deepEqual(card.find('.profile-links a[href]').map((_, element) => leaderboardPage(element).attr('href')).get(),
        [`https://ghfind.com/u/${person.login}`, person.githubUrl, person.recordUrl]);
      assert.ok(person.recordUrl.includes(`/blob/${sha}/participants/`));
      assert.equal(card.find('.rank-number').text(), String(person.rank));
      assert.equal(card.attr('value'), String(person.rank));
      assert.equal(person.rank, 1 + program.leaderboard.filter(other =>
        other.stats.experience > person.stats.experience).length);
      const threshold = profile.level === 1 ? program.rules.level2 : profile.level === 2 ? program.rules.level3 : null;
      assert.deepEqual(card.find('progress').map((_, element) => Number(leaderboardPage(element).attr('max'))).get(),
        threshold ? Object.values(threshold).filter(required => required > 0) : []);
      assert.deepEqual(card.find('.history-list a').map((_, element) => leaderboardPage(element).attr('href')).get(), person.history.map(event => event.href));
      if (!profile.promotions.some(event => event.proof.source.kind === 'registration')) assert.equal(person.joinedAt, null);
    }
    assert.equal($('html').attr('lang'), 'zh-CN');
    const {copy} = JSON.parse($('#page-data').text());
    for (const attribute of ['data-i18n', 'data-i18n-placeholder', 'data-i18n-aria-label', 'data-i18n-alt']) {
      $(`[${attribute}]`).each((_, element) => {
        const key = $(element).attr(attribute);
        assert.ok(copy[key]?.en && copy[key]?.zh, `Missing bilingual content: ${key}`);
        const rendered = attribute === 'data-i18n' ? $(element).text() : $(element).attr(attribute.slice('data-i18n-'.length));
        assert.equal(rendered, copy[key].zh, `Incorrect initial language: ${key}`);
      });
    }
    const leaderboardCopy = JSON.parse(leaderboardPage('#page-data').text()).copy;
    for (const attribute of ['data-i18n', 'data-i18n-placeholder', 'data-i18n-aria-label', 'data-i18n-alt']) {
      leaderboardPage(`[${attribute}]`).each((_, element) => {
        const key = leaderboardPage(element).attr(attribute);
        assert.ok(leaderboardCopy[key]?.en && leaderboardCopy[key]?.zh, `Missing leaderboard bilingual content: ${key}`);
        const rendered = attribute === 'data-i18n' ? leaderboardPage(element).text() : leaderboardPage(element).attr(attribute.slice('data-i18n-'.length));
        assert.equal(rendered, leaderboardCopy[key].zh, `Incorrect initial leaderboard language: ${key}`);
      });
    }
    for (const element of leaderboardPage('script[src], link[rel="stylesheet"]').toArray()) {
      const path = leaderboardPage(element).attr('href') ?? leaderboardPage(element).attr('src');
      await access(join(output, 'leaderboard', path.split('?')[0]));
    }
    const eventCopy = JSON.parse(eventPage('#page-data').text()).copy;
    for (const element of eventPage('[data-i18n]').toArray()) {
      const key = eventPage(element).attr('data-i18n');
      assert.ok(eventCopy[key]?.en && eventCopy[key]?.zh, `Missing event translation: ${key}`);
      assert.equal(eventPage(element).text(), eventCopy[key].zh);
    }
    for (const element of eventPage('.event-slides, script[src], link[rel="stylesheet"]').toArray()) {
      const path = eventPage(element).attr('href') ?? eventPage(element).attr('src');
      await access(join(output, 'events', path.split('?')[0]));
    }
    $('a[href^="#"]').each((_, element) => {
      const target = $(element).attr('href').slice(1);
      assert.equal($(`[id="${target}"]`).length, 1, `Broken in-page navigation: ${target}`);
    });
    for (const name of ['app.mjs', 'account.mjs', 'events.mjs', 'jobs.mjs', 'tasks.mjs', 'site.css', 'jobs.css', 'tasks.css', 'assets/process-mission.png', 'assets/mfcp-feishu-group.png', 'assets/ambassadors/luojia65.jpg', 'assets/ambassadors/kunyuanxu-star.jpg', 'assets/ambassadors/lianux-mm.jpg']) {
      assert.deepEqual(await readFile(join(output, name)), await readFile(join('site', name)));
    }
    for (const replay of events.replays.filter(replay => replay.slides)) {
      assert.deepEqual(await readFile(join(output, replay.slides)), await readFile(replay.slides));
    }
    assert.equal(await readFile(join(output, 'index.html'), 'utf8'), html);
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});
