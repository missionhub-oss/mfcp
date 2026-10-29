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
    const profiles = await Promise.all((await readdir('participants')).filter(file => file.endsWith('.json')).map(async file =>
      normalizeProfile(JSON.parse(await readFile(join('participants', file), 'utf8')), `participants/${file}`)));
    assert.equal($('.contributor-card').length, profiles.length);
    assert.deepEqual($('.ranking-list>.contributor-card').map((_, element) => $(element).attr('data-login')).get(),
      program.leaderboard.map(person => person.login.toLowerCase()));
    const tasks = issues.filter(issue => !issue.pull_request && issue.type?.name === 'Task');
    const inProgress = tasks.filter(issue => issue.state === 'open' && issue.assignees.length > 0);
    const completed = tasks.filter(issue => issue.state === 'closed' && issue.state_reason === 'completed');
    assert.equal(program.stats.tasks, tasks.length);
    assert.equal(program.stats.inProgressTasks, inProgress.length);
    assert.equal(program.stats.completedTasks, completed.length);
    assert.deepEqual($('.stats-grid>div').map((_, element) => ({
      label: $(element).find('[data-i18n]').text(), value: Number($(element).find('strong').text()),
    })).get(), [
      {label: '贡献者', value: profiles.length},
      {label: '任务总数', value: tasks.length},
      {label: '进行中', value: inProgress.length},
      {label: '已完成', value: completed.length},
    ]);
    assert.equal(program.stats.experience, profiles.reduce((sum, profile) => sum + totals(profile).experience, 0));
    for (const profile of profiles) {
      const person = program.participants.find(item => item.id === profile.github_id);
      assert.deepEqual(person.stats, totals(profile));
      const card = $(`#contributor-${profile.github_login.toLowerCase()}`);
      assert.equal(card.attr('data-level'), String(profile.level));
      assert.equal(card.attr('data-xp'), String(person.stats.experience));
      assert.deepEqual(card.find('.person-stats dd').map((_, element) => Number($(element).text())).get(),
        [person.stats.experience, person.stats.tasks, person.stats.pull_requests]);
      assert.deepEqual(card.find('.profile-links a[href]').map((_, element) => $(element).attr('href')).get(),
        [`https://ghfind.com/u/${person.login}`, person.githubUrl, person.recordUrl]);
      assert.ok(person.recordUrl.includes(`/blob/${sha}/participants/`));
      assert.equal(card.find('.rank-number').text(), String(person.rank));
      assert.equal(card.attr('value'), String(person.rank));
      assert.equal(person.rank, 1 + program.participants.filter(other =>
        other.stats.experience > person.stats.experience).length);
      const threshold = profile.level === 1 ? program.rules.level2 : profile.level === 2 ? program.rules.level3 : null;
      assert.deepEqual(card.find('progress').map((_, element) => Number($(element).attr('max'))).get(),
        threshold ? Object.values(threshold).filter(required => required > 0) : []);
      assert.deepEqual(card.find('.history-list a').map((_, element) => $(element).attr('href')).get(), person.history.map(event => event.href));
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
    $('a[href^="#"]').each((_, element) => {
      const target = $(element).attr('href').slice(1);
      assert.equal($(`[id="${target}"]`).length, 1, `Broken in-page navigation: ${target}`);
    });
    for (const name of ['app.mjs', 'site.css', 'assets/process-mission.png', 'assets/mfcp-feishu-group.png']) {
      assert.deepEqual(await readFile(join(output, name)), await readFile(join('site', name)));
    }
    assert.equal(await readFile(join(output, 'index.html'), 'utf8'), html);
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});
