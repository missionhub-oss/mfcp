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

test('blogs publishes top-level Markdown articles with standalone URLs and valid slide assets', async () => {
  await mkdir('.mfcp-runtime', {recursive: true});
  const output = await mkdtemp('.mfcp-runtime/blogs-');
  try {
    const {html, blogs} = await buildPages('.', {output});
    const home = load(html);
    const sourceNames = (await readdir('blogs')).filter(name => name.endsWith('.md') && !name.endsWith('.en.md')).sort();
    assert.deepEqual(blogs.map(post => `${post.slug}.md`).sort(), sourceNames);
    assert.equal(home('#main-nav a[href="blogs/"]').attr('target'), undefined);
    assert.equal(home('#main-nav a[href="blogs/"]').attr('rel'), undefined);

    const indexPath = resolve(output, 'blogs/index.html');
    const index = load(await readFile(indexPath, 'utf8'));
    assert.deepEqual(blogs.map(post => post.slug), [
      'rustsbi-security-firmware-2026',
      'humanize-runtime-and-flow-science',
      'qemu-riscv-performance-optimization',
      'zephyr-contribution-workflow',
    ]);
    assert.deepEqual(blogs.map(post => post.published_at), ['2026-11-20', '2026-11-13', '2026-11-06', '2026-10-23']);
    assert.deepEqual(index('.blog-entry h2 a').map((_, element) => index(element).attr('href')).get(),
      blogs.map(post => `${post.slug}/`));
    assert.deepEqual(index('.blog-entry').map((_, element) => index(element).hasClass('is-reversed')).get(),
      blogs.map((_, idx) => idx % 2 === 1));
    assert.equal(index('.blog-card, .blogs-list').length, 0);
    assert.equal(index('#main-nav a[aria-current="page"]').attr('href'), '../blogs/');
    assert.equal(index('link[rel="canonical"]').attr('href'), 'https://missionhub-oss.github.io/mfcp/blogs/');

    for (const element of index('img[src], script[src], link[rel="stylesheet"]').toArray()) {
      const path = index(element).attr('src') ?? index(element).attr('href');
      const url = new URL(path, pathToFileURL(indexPath));
      assert.equal(url.protocol, 'file:');
      await access(fileURLToPath(url));
    }

    for (const post of blogs) {
      const pagePath = resolve(output, 'blogs', post.slug, 'index.html');
      const page = load(await readFile(pagePath, 'utf8'));
      assert.equal(page('h1').length, 1);
      assert.equal(page('h1').text(), post.title);
      assert.equal(page('.blog-body[lang="zh-CN"]').length, 1);
      assert.equal(page('link[rel="canonical"]').attr('href'), `https://missionhub-oss.github.io/mfcp/blogs/${post.slug}/`);
      assert.equal(page('meta[property="og:type"]').attr('content'), 'article');
      assert.equal(page('#main-nav a[aria-current="page"]').attr('href'), '../../blogs/');

      const {copy} = JSON.parse(page('#page-data').text());
      for (const element of page('[data-i18n]').toArray()) {
        const key = page(element).attr('data-i18n');
        assert.ok(copy[key]?.en && copy[key]?.zh, `Missing blog translation: ${key}`);
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

      assert.equal(page('.blog-body script, .blog-body iframe, .blog-body [onclick]').length, 0);
      assert.equal(page('.blog-body figure, .blog-body figcaption').length, 0);
      assert.equal(page('.blog-body p > img').length, 0);
    }

    const humanizePath = resolve(output, 'blogs/humanize-runtime-and-flow-science/index.html');
    const humanize = load(await readFile(humanizePath, 'utf8'));
    assert.equal(humanize('.blog-body[lang="zh-CN"] .blog-media img').length, 37);
    assert.equal(humanize('.blog-body[lang="en"] .blog-media img').length, 37);
    for (const lang of ['zh-CN', 'en']) {
      const srcs = humanize(`.blog-body[lang="${lang}"] .blog-media img`).map((_, element) => humanize(element).attr('src')).get();
      for (let i = 1; i <= 37; i += 1) {
        const expected = `../assets/humanize-runtime-and-flow-science/slide-${String(i).padStart(2, '0')}.webp`;
        assert.ok(srcs.includes(expected), `Missing slide image in Humanize (${lang}) blog: ${expected}`);
      }
    }
    assert.ok(humanize('.blog-toc-sidebar ul[data-lang-block="zh"] a').length >= 5);
    assert.ok(humanize('.blog-toc-sidebar ul[data-lang-block="en"] a').length >= 5);
    assert.ok(humanize('.blog-toc-sidebar ul[data-lang-block="en"]').text().includes('Q&A'));
    assert.ok(!humanize('.blog-toc-sidebar ul[data-lang-block="en"]').text().includes('&amp;'));
    assert.ok(humanize('h1 [data-en]').attr('data-en').includes('Humanize'));
    const headingIds = humanize('.blog-body [id]').map((_, element) => humanize(element).attr('id')).get();
    assert.equal(new Set(headingIds).size, headingIds.length);

    const qemuPath = resolve(output, 'blogs/qemu-riscv-performance-optimization/index.html');
    const qemu = load(await readFile(qemuPath, 'utf8'));
    assert.equal(qemu('.blog-body[lang="zh-CN"] .blog-media img').length, 16);
    assert.equal(qemu('.blog-body[lang="en"] .blog-media img').length, 16);
    for (const lang of ['zh-CN', 'en']) {
      const srcs = qemu(`.blog-body[lang="${lang}"] .blog-media img`).map((_, element) => qemu(element).attr('src')).get();
      for (let i = 1; i <= 16; i += 1) {
        const expected = `../assets/qemu-riscv-performance-optimization/slide-${String(i).padStart(2, '0')}.webp`;
        assert.ok(srcs.includes(expected), `Missing slide image in QEMU (${lang}) blog: ${expected}`);
      }
    }
    assert.ok(qemu('.blog-toc-sidebar ul[data-lang-block="zh"] a').length >= 5);
    assert.ok(qemu('.blog-toc-sidebar ul[data-lang-block="en"] a').length >= 5);
    const qemuHeadingIds = qemu('.blog-body [id]').map((_, element) => qemu(element).attr('id')).get();
    assert.equal(new Set(qemuHeadingIds).size, qemuHeadingIds.length);

    const rustsbiPath = resolve(output, 'blogs/rustsbi-security-firmware-2026/index.html');
    const rustsbi = load(await readFile(rustsbiPath, 'utf8'));
    assert.equal(rustsbi('.blog-body[lang="zh-CN"] .blog-media img').length, 8);
    assert.equal(rustsbi('.blog-body[lang="en"] .blog-media img').length, 8);
    for (const lang of ['zh-CN', 'en']) {
      const srcs = rustsbi(`.blog-body[lang="${lang}"] .blog-media img`).map((_, element) => rustsbi(element).attr('src')).get();
      for (let i = 1; i <= 8; i += 1) {
        const expected = `../assets/rustsbi-security-firmware-2026/slide-${String(i).padStart(2, '0')}.webp`;
        assert.ok(srcs.includes(expected), `Missing slide image in RustSBI (${lang}) blog: ${expected}`);
      }
    }
    assert.ok(rustsbi('.blog-toc-sidebar ul[data-lang-block="zh"] a').length >= 5);
    assert.ok(rustsbi('.blog-toc-sidebar ul[data-lang-block="en"] a').length >= 5);
    assert.ok(rustsbi('.blog-toc-sidebar ul[data-lang-block="en"]').text().includes('Q&A'));
    assert.ok(!rustsbi('.blog-toc-sidebar ul[data-lang-block="en"]').text().includes('&amp;'));
    const rustsbiHeadingIds = rustsbi('.blog-body [id]').map((_, element) => rustsbi(element).attr('id')).get();
    assert.equal(new Set(rustsbiHeadingIds).size, rustsbiHeadingIds.length);

    const zephyrPath = resolve(output, 'blogs/zephyr-contribution-workflow/index.html');
    const zephyr = load(await readFile(zephyrPath, 'utf8'));
    assert.equal(zephyr('.blog-body[lang="zh-CN"] .blog-media img').length, 15);
    assert.equal(zephyr('.blog-body[lang="en"] .blog-media img').length, 15);
    for (const lang of ['zh-CN', 'en']) {
      const srcs = zephyr(`.blog-body[lang="${lang}"] .blog-media img`).map((_, element) => zephyr(element).attr('src')).get();
      for (let i = 1; i <= 15; i += 1) {
        const expected = `../assets/zephyr-contribution-workflow/slide-${String(i).padStart(2, '0')}.webp`;
        assert.ok(srcs.includes(expected), `Missing slide image in Zephyr (${lang}) blog: ${expected}`);
      }
    }
    assert.ok(zephyr('.blog-toc-sidebar ul[data-lang-block="zh"] a').length >= 5);
    assert.ok(zephyr('.blog-toc-sidebar ul[data-lang-block="en"] a').length >= 5);
    assert.ok(zephyr('.blog-toc-sidebar ul[data-lang-block="en"]').text().includes('Q&A'));
    assert.ok(!zephyr('.blog-toc-sidebar ul[data-lang-block="en"]').text().includes('&amp;'));
    const zephyrHeadingIds = zephyr('.blog-body [id]').map((_, element) => zephyr(element).attr('id')).get();
    assert.equal(new Set(zephyrHeadingIds).size, zephyrHeadingIds.length);
  } finally {
    await rm(output, {recursive: true, force: true});
  }
});
