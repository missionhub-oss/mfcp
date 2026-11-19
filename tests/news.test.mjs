// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, mkdtemp, readFile, readdir, rm, access} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {load} from 'cheerio';
import {imageSize} from 'image-size';
import {buildPages} from '../scripts/build-pages.mjs';

test('news publishes the real Markdown collection with complete partner records and usable article assets', async () => {
  await mkdir('.mfcp-runtime', {recursive: true});
  const output = await mkdtemp('.mfcp-runtime/news-');
  try {
    const {html, news} = await buildPages('.', {output});
    const home = load(html);
    const sourceNames = (await readdir('site/news')).filter(name => name.endsWith('.md')).sort();
    assert.deepEqual(news.map(article => `${article.slug}.md`).sort(), sourceNames);
    const partners = home('.partner-grid > .partner-link').map((_, element) =>
      home(element).attr('class').split(/\s+/).find(name => name.startsWith('partner-') && name !== 'partner-link').slice('partner-'.length)).get().sort();
    assert.deepEqual(news.filter(article => article.category === 'partner').map(article => article.partner).sort(), partners);
    assert.equal(home('#main-nav a[href="news/"]').attr('target'), undefined);
    assert.equal(home('#main-nav a[href="news/"]').attr('rel'), undefined);

    const index = load(await readFile(join(output, 'news/index.html'), 'utf8'));
    const featured = news.find(article => article.featured);
    assert.equal(index('.news-feature h2 a').attr('href'), `${featured.slug}/`);
    assert.deepEqual(index('.news-card h3 a').map((_, element) => index(element).attr('href')).get(),
      news.filter(article => article !== featured).map(article => `${article.slug}/`));
    assert.equal(index('#main-nav a[aria-current="page"]').attr('href'), '../news/');

    for (const article of news) {
      const pagePath = resolve(output, 'news', article.slug, 'index.html');
      const page = load(await readFile(pagePath, 'utf8'));
      assert.equal(page('h1').length, 1);
      assert.equal(page('h1').text(), article.title);
      assert.equal(page('.news-body').attr('lang'), 'zh-CN');
      assert.equal(page('link[rel="canonical"]').attr('href'), `https://missionhub-oss.github.io/mfcp/news/${article.slug}/`);
      assert.equal(page('meta[property="og:type"]').attr('content'), 'article');
      assert.equal(page('.news-post-meta time').first().attr('datetime'), article.joined_at ?? article.date);
      assert.equal(page('.news-post-meta time').last().attr('datetime'), article.published_at);
      const {copy} = JSON.parse(page('#page-data').text());
      for (const element of page('[data-i18n]').toArray()) {
        const key = page(element).attr('data-i18n');
        assert.ok(copy[key]?.en && copy[key]?.zh, `Missing news translation: ${key}`);
        assert.equal(page(element).text(), copy[key].zh);
      }
      for (const element of page('img[src], script[src], link[rel="stylesheet"]').toArray()) {
        const path = page(element).attr('src') ?? page(element).attr('href');
        const url = new URL(path, pathToFileURL(pagePath));
        assert.equal(url.protocol, 'file:');
        await access(fileURLToPath(url));
        if (element.tagName === 'img') {
          const dimensions = imageSize(await readFile(fileURLToPath(url)));
          assert.equal(Number(page(element).attr('width')), dimensions.width);
          assert.equal(Number(page(element).attr('height')), dimensions.height);
        }
      }
      assert.equal(page('.news-body script, .news-body iframe, .news-body [onclick]').length, 0);
    }

    const meetup = load(await readFile(join(output, 'news/2026-11-14-beijing-meetup/index.html'), 'utf8'));
    assert.match(meetup('.news-body').text(), /预计参加 20 人，实际到场 16 人/);
    assert.match(meetup('.news-body blockquote').text(), /社区成员个人身份/);
    assert.match(meetup('.news-body blockquote').text(), /不代表所在单位意见/);
    assert.equal(meetup('.news-body figure img').length, 2);
    assert.equal(meetup('.news-body p > figure').length, 0);
  } finally {
    await rm(output, {recursive: true, force: true});
  }
});
