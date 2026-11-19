// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {mkdir, writeFile, copyFile, cp, readFile, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import nunjucks from 'nunjucks';
import {loadProgram, repositoryUrl} from './lib/pages.mjs';
import {loadCommunity} from './lib/community.mjs';
import {loadEvents} from './lib/events.mjs';
import {loadNews} from './lib/news.mjs';
import {copy, projects, communityUrl} from '../site/content.mjs';

const siteDirectory = fileURLToPath(new URL('../site/', import.meta.url));
const slidesDirectory = fileURLToPath(new URL('../slides/', import.meta.url));
const template = new nunjucks.Environment(new nunjucks.FileSystemLoader(siteDirectory), {autoescape: true, throwOnUndefined: true});
template.addFilter('date', value => new Intl.DateTimeFormat('zh-CN', {month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'}).format(new Date(value)));
template.addFilter('jsonScript', value => new nunjucks.runtime.SafeString(JSON.stringify(value).replaceAll('<', '\\u003c')));

export async function buildPages(directory = '.', {output = join(directory, 'site-dist'), sha, issues} = {}) {
  sha ??= execFileSync('git', ['rev-parse', 'HEAD'], {cwd: directory, encoding: 'utf8'}).trim();
  const program = await loadProgram(directory, {sha, issues});
  const assetNames = ['site.css', 'app.mjs', 'news.css'];
  const assetVersions = Object.fromEntries(await Promise.all(assetNames.map(async name =>
    [name, createHash('sha256').update(await readFile(join(siteDirectory, name))).digest('hex').slice(0, 16)])));
  const community = await loadCommunity();
  const events = await loadEvents();
  const news = await loadNews();
  const siteUrl = 'https://missionhub-oss.github.io/mfcp/';
  const common = {projects, program, community, communityUrl, events, repositoryUrl, assetVersions, siteUrl, isNews: false, isEvents: false, isLeaderboard: false};
  const html = template.render('index.njk', {...common, copy, payload: {copy, homePath: ''}, homePath: '', isNews: false});
  await mkdir(output, {recursive: true});
  await writeFile(join(output, 'index.html'), html);
  await writeFile(join(output, '.nojekyll'), '');
  for (const name of assetNames) await copyFile(join(siteDirectory, name), join(output, name));
  await cp(join(siteDirectory, 'assets'), join(output, 'assets'), {recursive: true});
  await cp(slidesDirectory, join(output, 'slides'), {recursive: true});
  const eventCopy = {...copy,
    'meta.title': {en: 'Events · Mission Forge Contributor Program', zh: '活动 · MFCP 开源人才培养计划'},
    'meta.description': copy['events.description'],
  };
  const eventPage = template.render('events.njk', {...common, copy: eventCopy, payload: {copy: eventCopy, homePath: '../'}, homePath: '../', isEvents: true});
  await mkdir(join(output, 'events'), {recursive: true});
  await writeFile(join(output, 'events/index.html'), eventPage);
  const leaderboardCopy = {...copy,
    'meta.title': {en: 'Leaderboard · Mission Forge Contributor Program', zh: '排行榜 · MFCP 开源人才培养计划'},
    'meta.description': copy['ranking.description'],
  };
  const leaderboardPage = template.render('leaderboard.njk', {
    ...common,
    copy: leaderboardCopy,
    payload: {copy: leaderboardCopy, homePath: '../'},
    homePath: '../',
    isLeaderboard: true,
    pageUrl: new URL('leaderboard/', siteUrl).href,
  });
  await mkdir(join(output, 'leaderboard'), {recursive: true});
  await writeFile(join(output, 'leaderboard/index.html'), leaderboardPage);
  async function writeNewsPage(article) {
    const path = article ? `news/${article.slug}/` : 'news/';
    const pageCopy = {...copy,
      'meta.title': article ? {en: `${article.title} · MFCP News`, zh: `${article.title} · MFCP 新闻`} : {en: 'News · Mission Forge Contributor Program', zh: '社区新闻 · MFCP 开源人才培养计划'},
      'meta.description': article ? {en: article.summary, zh: article.summary} : copy['news.description'],
    };
    const body = template.render('news.njk', {...common, copy: pageCopy, payload: {copy: pageCopy}, article, news,
      featured: news.find(item => item.featured) ?? null, homePath: article ? '../../' : '../', isNews: true,
      pageUrl: new URL(path, siteUrl).href});
    const target = join(output, path);
    await mkdir(target, {recursive: true});
    await writeFile(join(target, 'index.html'), body);
  }
  await rm(join(output, 'news'), {recursive: true, force: true});
  await writeNewsPage(null);
  for (const article of news) await writeNewsPage(article);
  console.log(`Built MFCP website for ${program.stats.participants} contributors at ${sha}.`);
  return {program, html, output, news};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await buildPages(resolve(process.argv[2] || '.'));
