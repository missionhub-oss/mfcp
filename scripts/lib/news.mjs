// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {readFile, readdir} from 'node:fs/promises';
import {basename, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import matter from 'gray-matter';
import {Marked} from 'marked';
import sanitizeHtml from 'sanitize-html';
import escapeHtml from 'escape-html';
import {imageSize} from 'image-size';
import {z} from 'zod';

const siteDirectory = fileURLToPath(new URL('../../site/', import.meta.url));
const newsDirectory = resolve(siteDirectory, 'news');
const schema = z.strictObject({
  title: z.string().min(1),
  summary: z.string().min(1),
  category: z.enum(['community', 'partner']),
  date: z.iso.date(),
  published_at: z.iso.date(),
  cover: z.string().min(1),
  cover_alt: z.string().min(1),
  featured: z.boolean().default(false),
  partner: z.string().regex(/^[a-z0-9-]+$/).optional(),
  joined_at: z.iso.datetime({offset: true}).optional(),
  source_commit: z.string().regex(/^[a-f0-9]{40}$/).optional(),
}).refine(value => value.category !== 'partner' || Boolean(value.partner && value.joined_at && value.source_commit), {
  message: 'Partner news requires a partner ID, joining timestamp and source commit.',
});

const dateInBeijing = value => new Intl.DateTimeFormat('en-CA', {
  year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai',
}).format(new Date(value));

function joinedLabel(value) {
  return Object.fromEntries(['en', 'zh'].map(language => [language, new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Shanghai',
  }).format(new Date(value))]));
}

function assetPath(href) {
  if (/[?#]/.test(href)) throw new Error(`News images must use a local asset path: ${href}`);
  const path = resolve(newsDirectory, href);
  const publicPath = relative(siteDirectory, path).split(sep).join('/');
  if (!publicPath.startsWith('assets/')) throw new Error(`News image is outside site/assets: ${href}`);
  return {path, src: publicPath};
}

function rejectExecutableFrontMatter() {
  throw new Error('News front matter must use YAML.');
}

export async function loadNews() {
  const names = (await readdir(newsDirectory)).filter(name => name.endsWith('.md')).sort();
  const articles = [];
  const assets = new Map();
  async function image(href) {
    const {path, src} = assetPath(href);
    if (!assets.has(path)) {
      const {width, height} = imageSize(await readFile(path));
      if (!width || !height) throw new Error(`News image dimensions are missing: ${href}`);
      assets.set(path, {src, width, height});
    }
    return assets.get(path);
  }
  for (const name of names) {
    const slug = basename(name, '.md');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Invalid news filename: ${name}`);
    const raw = await readFile(resolve(newsDirectory, name), 'utf8');
    const parsed = matter(raw, {engines: {javascript: rejectExecutableFrontMatter, js: rejectExecutableFrontMatter}});
    const metadata = schema.parse(parsed.data);
    if (!parsed.content.trim()) throw new Error(`News article is empty: ${name}`);
    if (metadata.category === 'partner' && metadata.date !== dateInBeijing(metadata.joined_at)) {
      throw new Error(`Partner joining date disagrees with its timestamp: ${name}`);
    }
    const cover = {...await image(metadata.cover), alt: metadata.cover_alt};
    const images = new Map();
    const markdown = new Marked({gfm: true});
    const tokens = markdown.lexer(parsed.content);
    const imageSources = new Set();
    markdown.walkTokens(tokens, token => {
      if (token.type === 'image') imageSources.add(token.href);
      if (token.type === 'heading' && token.depth === 1) throw new Error(`Put the article title in front matter: ${name}`);
    });
    for (const href of imageSources) images.set(href, await image(href));
    markdown.use({renderer: {
      paragraph({tokens}) {
        let hasImage = false;
        markdown.walkTokens(tokens, token => {if (token.type === 'image') hasImage = true;});
        const body = this.parser.parseInline(tokens);
        return hasImage ? `<div>${body}</div>` : `<p>${body}</p>`;
      },
      image({href, text}) {
        const asset = images.get(href);
        if (!asset) throw new Error(`Unknown news image: ${href}`);
        const alt = escapeHtml(text);
        return `<figure><img src="../../${escapeHtml(asset.src)}" alt="${alt}" width="${asset.width}" height="${asset.height}" loading="lazy" decoding="async"><figcaption>${alt}</figcaption></figure>`;
      },
    }});
    const html = sanitizeHtml(markdown.parser(tokens), {
      allowedTags: sanitizeHtml.defaults.allowedTags.filter(tag => tag !== 'h1').concat(['img', 'figure', 'figcaption']),
      allowedAttributes: {
        a: ['href', 'title', 'target', 'rel'],
        img: ['src', 'alt', 'width', 'height', 'loading', 'decoding'],
        code: ['class'],
      },
      allowedSchemes: ['https', 'http', 'mailto'],
      allowProtocolRelative: false,
      transformTags: {
        a: (tagName, attributes) => ({tagName, attribs: {...attributes, target: '_blank', rel: 'noopener noreferrer'}}),
      },
    });
    articles.push({...metadata, slug, cover, html,
      joinedLabel: metadata.joined_at ? joinedLabel(metadata.joined_at) : null});
  }
  const occurredAt = article => Date.parse(article.joined_at ?? `${article.date}T00:00:00+08:00`);
  return articles.sort((a, b) => occurredAt(b) - occurredAt(a) || a.slug.localeCompare(b.slug));
}
