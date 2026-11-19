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
import {loadBlogs} from './lib/blogs.mjs';
import {copy, projects, communityUrl} from '../site/content.mjs';

const siteDirectory = fileURLToPath(new URL('../site/', import.meta.url));
const slidesDirectory = fileURLToPath(new URL('../slides/', import.meta.url));
const blogsAssetsDirectory = fileURLToPath(new URL('../blogs/assets/', import.meta.url));
const template = new nunjucks.Environment(new nunjucks.FileSystemLoader(siteDirectory), {autoescape: true, throwOnUndefined: true});
template.addFilter('date', value => new Intl.DateTimeFormat('zh-CN', {month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'}).format(new Date(value)));
template.addFilter('jsonScript', value => new nunjucks.runtime.SafeString(JSON.stringify(value).replaceAll('<', '\\u003c')));

export async function buildPages(directory = '.', {output = join(directory, 'site-dist'), sha, issues} = {}) {
  sha ??= execFileSync('git', ['rev-parse', 'HEAD'], {cwd: directory, encoding: 'utf8'}).trim();
  const program = await loadProgram(directory, {sha, issues});
  const assetNames = ['site.css', 'app.mjs', 'account.mjs', 'news.css', 'blogs.css', 'tasks.css', 'tasks.mjs'];
  const assetVersions = Object.fromEntries(await Promise.all(assetNames.map(async name =>
    [name, createHash('sha256').update(await readFile(join(siteDirectory, name))).digest('hex').slice(0, 16)])));
  const community = await loadCommunity();
  const events = await loadEvents();
  const news = await loadNews();
  const blogs = await loadBlogs();
  const siteUrl = 'https://missionhub-oss.github.io/mfcp/';
  const repositorySlug = 'missionhub-oss/mfcp';
  const common = {projects, program, community, communityUrl, events, repositoryUrl, assetVersions, siteUrl, isNews: false, isBlogs: false, isEvents: false, isTasks: false, isLeaderboard: false, isProfile: false, profilePerson: null};
  const pagePayload = (pageCopy, homePath, extra = {}) => ({
    copy: pageCopy,
    homePath,
    repositoryUrl,
    repositorySlug,
    builtAt: program.builtAt,
    rulesPoints: program.rules.points,
    projects,
    ...extra,
  });
  const html = template.render('index.njk', {...common, copy, payload: pagePayload(copy, ''), homePath: '', isNews: false});
  await mkdir(output, {recursive: true});
  await writeFile(join(output, 'index.html'), html);
  await writeFile(join(output, '.nojekyll'), '');
  await writeFile(join(output, '404.html'), template.render('404.njk', {}));
  for (const name of assetNames) await copyFile(join(siteDirectory, name), join(output, name));
  await cp(join(siteDirectory, 'assets'), join(output, 'assets'), {recursive: true});
  await cp(slidesDirectory, join(output, 'slides'), {recursive: true});
  await writeFile(join(output, 'profile-index.json'), JSON.stringify({
    sha: program.sha,
    builtAt: program.builtAt,
    repositoryUrl,
    rulesUrl: program.rulesUrl,
    rules: {
      id: program.rules.id,
      year: program.rules.year,
      points: program.rules.points,
      level2: program.rules.level2,
      level3: program.rules.level3,
    },
    leaderboardCount: program.leaderboard.length,
    participants: program.participants,
  }));
  const eventCopy = {...copy,
    'meta.title': {en: 'Events · Mission Forge Contributor Program', zh: '活动 · MFCP 开源人才培养计划'},
    'meta.description': copy['events.description'],
  };
  const eventPage = template.render('events.njk', {...common, copy: eventCopy, payload: pagePayload(eventCopy, '../'), homePath: '../', isEvents: true});
  await mkdir(join(output, 'events'), {recursive: true});
  await writeFile(join(output, 'events/index.html'), eventPage);
  const leaderboardCopy = {...copy,
    'meta.title': {en: 'Leaderboard · Mission Forge Contributor Program', zh: '排行榜 · MFCP 开源人才培养计划'},
    'meta.description': copy['ranking.description'],
  };
  const leaderboardPage = template.render('leaderboard.njk', {
    ...common,
    copy: leaderboardCopy,
    payload: pagePayload(leaderboardCopy, '../'),
    homePath: '../',
    isLeaderboard: true,
    pageUrl: new URL('leaderboard/', siteUrl).href,
  });
  await mkdir(join(output, 'leaderboard'), {recursive: true});
  await writeFile(join(output, 'leaderboard/index.html'), leaderboardPage);
  const profileCopy = {...copy,
    'meta.title': {en: 'Contributor Profile · Mission Forge Contributor Program', zh: '开源履历 · MFCP 开源人才培养计划'},
    'meta.description': copy['account.profilePageDesc'],
  };
  const profilePage = template.render('profile.njk', {
    ...common,
    copy: profileCopy,
    payload: pagePayload(profileCopy, '../'),
    homePath: '../',
    isProfile: true,
    pageUrl: new URL('profile/', siteUrl).href,
  });
  await mkdir(join(output, 'profile'), {recursive: true});
  await writeFile(join(output, 'profile/index.html'), profilePage);

  const reservedRoutes = new Set(['assets', 'blogs', 'events', 'leaderboard', 'news', 'profile', 'slides', 'tasks']);
  for (const person of program.participants) {
    const slug = person.login.toLowerCase();
    if (reservedRoutes.has(slug)) continue;
    const personCopy = {
      ...copy,
      'meta.title': {
        en: `${person.login} · MFCP Open-Source Profile`,
        zh: `${person.login} · MFCP 开源履历`,
      },
      'meta.description': {
        en: `${person.login} (L${person.level}, ${person.stats.experience} XP) open-source profile on MFCP.`,
        zh: `${person.login}（L${person.level} · ${person.stats.experience} XP）的 MFCP 开源履历。`,
      },
    };
    const personPage = template.render('profile.njk', {
      ...common,
      copy: personCopy,
      payload: pagePayload(personCopy, '../', {
        profileLogin: person.login,
        profileData: person,
        leaderboardCount: program.leaderboard.length,
      }),
      profilePerson: person,
      homePath: '../',
      isProfile: true,
      pageUrl: new URL(`${slug}/`, siteUrl).href,
    });
    const targetDir = join(output, slug);
    await mkdir(targetDir, {recursive: true});
    await writeFile(join(targetDir, 'index.html'), personPage);
  }
  const taskCopy = {...copy,
    'meta.title': {en: 'Task Plaza · Mission Forge Contributor Program', zh: '任务广场 · MFCP 开源人才培养计划'},
    'meta.description': copy['tasks.description'],
  };
  const taskPage = template.render('tasks.njk', {
    ...common,
    copy: taskCopy,
    payload: pagePayload(taskCopy, '../'),
    tasks: program.taskCatalog,
    homePath: '../',
    isTasks: true,
    pageUrl: new URL('tasks/', siteUrl).href,
  });
  await mkdir(join(output, 'tasks'), {recursive: true});
  await writeFile(join(output, 'tasks/index.html'), taskPage);
  await writeFile(join(output, 'tasks/tasks-data.json'), JSON.stringify({
    sha: program.sha,
    builtAt: program.builtAt,
    repositoryUrl,
    repositorySlug,
    rulesPoints: program.rules.points,
    stats: program.taskCatalog.stats,
    facets: program.taskCatalog.facets,
    items: program.taskCatalog.items,
  }));
  async function writeNewsPage(article) {
    const path = article ? `news/${article.slug}/` : 'news/';
    const homePath = article ? '../../' : '../';
    const pageCopy = {...copy,
      'meta.title': article ? {en: `${article.title} · MFCP News`, zh: `${article.title} · MFCP 新闻`} : {en: 'News · Mission Forge Contributor Program', zh: '社区新闻 · MFCP 开源人才培养计划'},
      'meta.description': article ? {en: article.summary, zh: article.summary} : copy['news.description'],
    };
    const body = template.render('news.njk', {...common, copy: pageCopy, payload: pagePayload(pageCopy, homePath), article, news,
      featured: news.find(item => item.featured) ?? null, homePath, isNews: true,
      pageUrl: new URL(path, siteUrl).href});
    const target = join(output, path);
    await mkdir(target, {recursive: true});
    await writeFile(join(target, 'index.html'), body);
  }
  await rm(join(output, 'news'), {recursive: true, force: true});
  await writeNewsPage(null);
  for (const article of news) await writeNewsPage(article);
  async function writeBlogPage(post) {
    const path = post ? `blogs/${post.slug}/` : 'blogs/';
    const homePath = post ? '../../' : '../';
    const pageCopy = {...copy,
      'meta.title': post
        ? {en: `${post.localizedTitle.en} · MFCP Blogs`, zh: `${post.title} · MFCP 技术博客`}
        : {en: 'Blogs · Mission Forge Contributor Program', zh: '技术博客 · MFCP 开源人才培养计划'},
      'meta.description': post
        ? {en: post.localizedSummary.en, zh: post.summary}
        : copy['blogs.description'],
    };
    const body = template.render('blogs.njk', {...common, copy: pageCopy, payload: pagePayload(pageCopy, homePath), post, blogs,
      homePath, isBlogs: true,
      pageUrl: new URL(path, siteUrl).href});
    const target = join(output, path);
    await mkdir(target, {recursive: true});
    await writeFile(join(target, 'index.html'), body);
  }
  await rm(join(output, 'blogs'), {recursive: true, force: true});
  await writeBlogPage(null);
  for (const post of blogs) await writeBlogPage(post);
  if (blogs.length) await cp(blogsAssetsDirectory, join(output, 'blogs/assets'), {recursive: true});
  console.log(`Built MFCP website for ${program.stats.participants} contributors at ${sha}.`);
  return {program, html, output, news, blogs};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await buildPages(resolve(process.argv[2] || '.'));
