// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, mkdtemp, readFile, readdir, rm, access, writeFile, copyFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {load} from 'cheerio';
import {imageSize} from 'image-size';
import {buildPages} from '../scripts/build-pages.mjs';
import {loadJobs} from '../scripts/lib/jobs.mjs';

test('jobs navigation is placed between Hall of Fame and Events and builds standalone pages', async () => {
  await mkdir('.mfcp-runtime', {recursive: true});
  const output = await mkdtemp('.mfcp-runtime/jobs-real-');
  try {
    const {html, jobs} = await buildPages('.', {output});
    const home = load(html);
    const navItems = home('#main-nav a').map((_, element) => ({
      href: home(element).attr('href'),
      text: home(element).text().trim(),
      target: home(element).attr('target'),
      rel: home(element).attr('rel'),
    })).get();

    assert.equal(navItems[0].href, 'leaderboard/');
    assert.equal(navItems[0].text, '名人堂');
    assert.equal(navItems[1].href, 'jobs/');
    assert.equal(navItems[1].text, '招聘');
    assert.equal(navItems[1].target, undefined);
    assert.equal(navItems[1].rel, undefined);
    assert.equal(navItems[2].href, 'events/');
    assert.equal(navItems[2].text, '活动');
    assert.equal(home('#main-nav a[target]').length, 0);

    const sourceNames = (await readdir('jobs'))
      .filter(name => name.endsWith('.md') && !name.endsWith('.en.md') && name.toLowerCase() !== 'readme.md')
      .sort();
    assert.deepEqual(jobs.map(item => `${item.slug}.md`).sort(), sourceNames);
    assert.ok(jobs.length >= 1, 'Expected at least the example job posting in jobs/');

    const indexPath = resolve(output, 'jobs/index.html');
    const index = load(await readFile(indexPath, 'utf8'));
    assert.equal(index('h1').length, 1);
    assert.equal(index('h1').text().trim(), '招聘。');
    assert.equal(index('.jobs-heading .section-description').length, 0);
    assert.equal(index('#main-nav a[aria-current="page"]').attr('href'), '../jobs/');
    assert.equal(index('#main-nav a[target]').length, 0);
    assert.equal(index('link[rel="canonical"]').attr('href'), 'https://missionhub-oss.github.io/mfcp/jobs/');

    const {copy} = JSON.parse(index('#page-data').text());
    for (const attribute of ['data-i18n', 'data-i18n-aria-label']) {
      index(`[${attribute}]`).each((_, element) => {
        const key = index(element).attr(attribute);
        assert.ok(copy[key]?.en && copy[key]?.zh, `Missing jobs translation: ${key}`);
        const rendered = attribute === 'data-i18n' ? index(element).text() : index(element).attr(attribute.slice('data-i18n-'.length));
        assert.equal(rendered, copy[key].zh);
      });
    }

    for (const element of index('script[src], link[rel="stylesheet"]').toArray()) {
      const path = index(element).attr('src') ?? index(element).attr('href');
      const url = new URL(path, pathToFileURL(indexPath));
      assert.equal(url.protocol, 'file:');
      await access(fileURLToPath(url));
    }

    for (const item of jobs) {
      const pagePath = resolve(output, 'jobs', item.slug, 'index.html');
      const page = load(await readFile(pagePath, 'utf8'));
      assert.equal(page('h1').length, 1);
      assert.equal(page('h1').text(), item.title);
      assert.equal(page('.job-body[lang="zh-CN"]').length, 1);
      assert.equal(page('link[rel="canonical"]').attr('href'), `https://missionhub-oss.github.io/mfcp/jobs/${item.slug}/`);
      assert.equal(page('#main-nav a[aria-current="page"]').attr('href'), '../../jobs/');
      assert.equal(page('.job-body script, .job-body iframe, .job-body [onclick]').length, 0);
      for (const element of page('script[src], link[rel="stylesheet"]').toArray()) {
        const path = page(element).attr('src') ?? page(element).attr('href');
        const url = new URL(path, pathToFileURL(pagePath));
        assert.equal(url.protocol, 'file:');
        await access(fileURLToPath(url));
      }
    }

    const notFound = await readFile(join(output, '404.html'), 'utf8');
    assert.match(notFound, /'jobs'/);
  } finally {
    await rm(output, {recursive: true, force: true});
  }
});

test('jobs index renders empty state when only README.md exists', async () => {
  await mkdir('.mfcp-runtime', {recursive: true});
  const emptyJobsDir = await mkdtemp('.mfcp-runtime/jobs-empty-src-');
  const output = await mkdtemp('.mfcp-runtime/jobs-empty-dist-');
  try {
    await writeFile(join(emptyJobsDir, 'README.md'), '# Jobs guide\n');
    const {jobs} = await buildPages('.', {output, jobsDirectory: emptyJobsDir});
    assert.deepEqual(jobs, []);
    const index = load(await readFile(join(output, 'jobs/index.html'), 'utf8'));
    assert.equal(index('.jobs-empty').length, 1);
    assert.equal(index('.job-card').length, 0);
  } finally {
    await rm(emptyJobsDir, {recursive: true, force: true});
    await rm(output, {recursive: true, force: true});
  }
});

test('jobs Markdown pipeline renders bilingual postings, sorting, assets, and sanitization', async () => {
  await mkdir('.mfcp-runtime', {recursive: true});
  const jobsDir = await mkdtemp('.mfcp-runtime/jobs-src-');
  const output = await mkdtemp('.mfcp-runtime/jobs-dist-');
  try {
    await mkdir(join(jobsDir, 'assets'), {recursive: true});
    await copyFile('site/assets/process-mission.png', join(jobsDir, 'assets/team.png'));
    await writeFile(join(jobsDir, 'README.md'), '# Jobs guide\n');

    await writeFile(join(jobsDir, 'closed-role.md'), `---
title: 已归档岗位
company: MissionHub
summary: 已完成招聘的历史岗位。
location: 上海
employment_type: full-time
status: closed
published_at: "2026-11-25"
---

## 岗位说明

该岗位已完成招聘。
`);

    await writeFile(join(jobsDir, 'zephyr-intern.md'), `---
title: Zephyr 嵌入式实习生
company: Process Mission
summary: 参与 Zephyr RTOS 驱动开发与板级验证。
location: 北京 / 远程
employment_type: intern
work_mode: hybrid
salary: 300-500 元/天
experience: 在校生
published_at: "2026-11-20"
tags:
  - Zephyr
  - RTOS
apply_email: jobs@processmission.example
---

## 岗位职责

参与上游驱动开发与提交。<script>alert(1)</script>

![团队示意图](assets/team.png)
`);

    await writeFile(join(jobsDir, 'linux-kernel-engineer.md'), `---
title: Linux 内核工程师
company: Process Mission
summary: 负责 RISC-V 内核子系统研发与上游合入。
location: 远程
employment_type: full-time
work_mode: remote
salary: 30K-45K
experience: 3 年以上
published_at: "2026-11-18"
updated_at: "2026-11-26"
featured: true
tags:
  - Linux
  - RISC-V
apply_url: https://example.com/apply/linux-kernel
apply_email: kernel-jobs@processmission.example
---

## 岗位职责

推动 RISC-V 架构特性合入主线。

## 任职要求

具备丰富的 Linux 内核调试与社区协作经验。
`);

    await writeFile(join(jobsDir, 'linux-kernel-engineer.en.md'), `---
title: Linux Kernel Engineer
company: Process Mission
summary: Work on RISC-V kernel subsystems and upstream patch series.
location: Remote
employment_type: full-time
work_mode: remote
salary: 30K-45K CNY
experience: 3+ years
published_at: "2026-11-18"
updated_at: "2026-11-26"
featured: true
tags:
  - Linux
  - RISC-V
apply_url: https://example.com/apply/linux-kernel
apply_email: kernel-jobs@processmission.example
---

## Responsibilities

Drive RISC-V kernel features upstream.

## Requirements

Hands-on Linux kernel debugging and upstream collaboration experience.
`);

    const {jobs} = await buildPages('.', {output, jobsDirectory: jobsDir});
    assert.deepEqual(jobs.map(item => item.slug), [
      'linux-kernel-engineer',
      'zephyr-intern',
      'closed-role',
    ]);

    const indexPath = resolve(output, 'jobs/index.html');
    const index = load(await readFile(indexPath, 'utf8'));
    assert.equal(index('.jobs-empty').length, 0);
    assert.equal(index('.jobs-count strong').text().trim(), '2');
    assert.deepEqual(index('.job-card h2 a').map((_, element) => index(element).attr('href')).get(), [
      'linux-kernel-engineer/',
      'zephyr-intern/',
      'closed-role/',
    ]);
    assert.equal(index('.job-card').first().hasClass('is-featured'), true);
    assert.equal(index('.job-card').last().hasClass('is-closed'), true);

    const kernelPath = resolve(output, 'jobs/linux-kernel-engineer/index.html');
    const kernel = load(await readFile(kernelPath, 'utf8'));
    assert.equal(kernel('h1').length, 1);
    assert.equal(kernel('h1 [data-zh]').attr('data-zh'), 'Linux 内核工程师');
    assert.equal(kernel('h1 [data-en]').attr('data-en'), 'Linux Kernel Engineer');
    assert.equal(kernel('.job-body[lang="zh-CN"]').length, 1);
    assert.equal(kernel('.job-body[lang="en"]').length, 1);
    assert.equal(kernel('.job-toc-sidebar ul[data-lang-block="zh"] a').length, 2);
    assert.equal(kernel('.job-toc-sidebar ul[data-lang-block="en"] a').length, 2);
    assert.equal(kernel('.job-post-header .job-actions a[href="https://example.com/apply/linux-kernel"]').length, 1);
    assert.equal(kernel('.job-post-header .job-actions a[href="mailto:kernel-jobs@processmission.example"]').length, 1);
    assert.equal(kernel('link[rel="canonical"]').attr('href'), 'https://missionhub-oss.github.io/mfcp/jobs/linux-kernel-engineer/');
    assert.equal(kernel('#main-nav a[aria-current="page"]').attr('href'), '../../jobs/');

    const internPath = resolve(output, 'jobs/zephyr-intern/index.html');
    const intern = load(await readFile(internPath, 'utf8'));
    assert.equal(intern('.job-body script, .job-body iframe, .job-body [onclick]').length, 0);
    assert.equal(intern('.job-body .job-media img').length, 1);
    const imgSrc = intern('.job-body .job-media img').attr('src');
    assert.equal(imgSrc, '../assets/team.png');
    const imgPath = fileURLToPath(new URL(imgSrc, pathToFileURL(internPath)));
    const dims = imageSize(await readFile(imgPath));
    assert.equal(Number(intern('.job-body .job-media img').attr('width')), dims.width);
    assert.equal(Number(intern('.job-body .job-media img').attr('height')), dims.height);

    const closedPath = resolve(output, 'jobs/closed-role/index.html');
    const closed = load(await readFile(closedPath, 'utf8'));
    assert.equal(closed('.job-closed-banner').length, 1);
    assert.equal(closed('.job-apply-panel').length, 0);
  } finally {
    await rm(jobsDir, {recursive: true, force: true});
    await rm(output, {recursive: true, force: true});
  }
});

test('loadJobs rejects invalid filenames, H1 body headings, orphan translations, and unsafe URLs', async () => {
  await mkdir('.mfcp-runtime', {recursive: true});
  const base = await mkdtemp('.mfcp-runtime/jobs-invalid-');
  try {
    const badNameDir = join(base, 'bad-name');
    await mkdir(badNameDir, {recursive: true});
    await writeFile(join(badNameDir, 'Bad_Name.md'), '---\ntitle: Test\ncompany: X\nsummary: Y\nlocation: Beijing\nemployment_type: full-time\npublished_at: "2026-11-26"\n---\n\nBody\n');
    await assert.rejects(() => loadJobs(badNameDir), /Invalid job filename/);

    const h1Dir = join(base, 'h1');
    await mkdir(h1Dir, {recursive: true});
    await writeFile(join(h1Dir, 'role.md'), '---\ntitle: Test\ncompany: X\nsummary: Y\nlocation: Beijing\nemployment_type: full-time\npublished_at: "2026-11-26"\n---\n\n# Heading\n');
    await assert.rejects(() => loadJobs(h1Dir), /Put the job title in front matter/);

    const orphanDir = join(base, 'orphan');
    await mkdir(orphanDir, {recursive: true});
    await writeFile(join(orphanDir, 'role.en.md'), '---\ntitle: Test\ncompany: X\nsummary: Y\nlocation: Beijing\nemployment_type: full-time\npublished_at: "2026-11-26"\n---\n\nBody\n');
    await assert.rejects(() => loadJobs(orphanDir), /English job translation has no base posting/);

    const jsFrontMatterDir = join(base, 'js-fm');
    await mkdir(jsFrontMatterDir, {recursive: true});
    await writeFile(join(jsFrontMatterDir, 'role.md'), '---js\n{title: "Test"}\n---\n\nBody\n');
    await assert.rejects(() => loadJobs(jsFrontMatterDir), /Job front matter must use YAML/);

    const badUrlDir = join(base, 'bad-url');
    await mkdir(badUrlDir, {recursive: true});
    await writeFile(join(badUrlDir, 'role.md'), '---\ntitle: Test\ncompany: X\nsummary: Y\nlocation: Beijing\nemployment_type: full-time\npublished_at: "2026-11-26"\napply_url: javascript:alert(1)\n---\n\nBody\n');
    await assert.rejects(() => loadJobs(badUrlDir), /Job apply_url must use http or https/);
  } finally {
    await rm(base, {recursive: true, force: true});
  }
});
