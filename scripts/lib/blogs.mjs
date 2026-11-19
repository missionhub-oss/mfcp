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

const rootDirectory = fileURLToPath(new URL('../../', import.meta.url));
const blogsDirectory = resolve(rootDirectory, 'blogs');

const schema = z.strictObject({
  title: z.string().min(1),
  summary: z.string().min(1),
  date: z.iso.date(),
  published_at: z.iso.date(),
  author: z.string().min(1),
  tags: z.array(z.string().min(1)).default([]),
  cover: z.string().min(1),
  cover_alt: z.string().min(1),
  featured: z.boolean().default(false),
  video_url: z.url().optional(),
  slides_path: z.string().regex(/^slides\/[a-zA-Z0-9._/-]+$/).optional(),
});

function assetPath(href) {
  if (/[?#]/.test(href)) throw new Error(`Blog images must use a local asset path: ${href}`);
  const path = resolve(blogsDirectory, href);
  const publicPath = relative(blogsDirectory, path).split(sep).join('/');
  if (!publicPath.startsWith('assets/')) throw new Error(`Blog image is outside blogs/assets: ${href}`);
  return {path, src: publicPath};
}

function rejectExecutableFrontMatter() {
  throw new Error('Blog front matter must use YAML.');
}

function estimateReadingMinutes(markdown, language = 'zh') {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1');
  const cjkCount = (plain.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const latinWords = (plain.replace(/[\u4e00-\u9fff]/g, ' ').match(/[A-Za-z0-9_+-]+/g) ?? []).length;
  if (language === 'en') return Math.max(1, Math.ceil(latinWords / 230));
  return Math.max(1, Math.ceil((cjkCount + latinWords) / 450));
}

function plainTextFromTokens(tokens = []) {
  let result = '';
  for (const token of tokens) {
    if (token.tokens) result += plainTextFromTokens(token.tokens);
    else if (typeof token.text === 'string') result += token.text;
  }
  return result.trim();
}

async function parsePostFile(name, {image, idPrefix, language}) {
  const raw = await readFile(resolve(blogsDirectory, name), 'utf8');
  const parsed = matter(raw, {engines: {javascript: rejectExecutableFrontMatter, js: rejectExecutableFrontMatter}});
  const metadata = schema.parse(parsed.data);
  if (!parsed.content.trim()) throw new Error(`Blog post is empty: ${name}`);
  const cover = {...await image(metadata.cover), alt: metadata.cover_alt};
  const images = new Map();
  const toc = [];
  let headingIndex = 0;
  const markdown = new Marked({gfm: true});
  const tokens = markdown.lexer(parsed.content);
  const imageSources = new Set();
  markdown.walkTokens(tokens, token => {
    if (token.type === 'image') imageSources.add(token.href);
    if (token.type === 'heading' && token.depth === 1) throw new Error(`Put the blog title in front matter: ${name}`);
  });
  for (const href of imageSources) images.set(href, await image(href));
  markdown.use({renderer: {
    heading({tokens, depth}) {
      const body = this.parser.parseInline(tokens);
      if (depth === 2 || depth === 3) {
        headingIndex += 1;
        const id = `${idPrefix}${headingIndex}`;
        if (depth === 2) {
          toc.push({id, text: plainTextFromTokens(tokens)});
        }
        return `<h${depth} id="${id}">${body}</h${depth}>`;
      }
      return `<h${depth}>${body}</h${depth}>`;
    },
    paragraph({tokens}) {
      let hasImage = false;
      markdown.walkTokens(tokens, token => {if (token.type === 'image') hasImage = true;});
      const body = this.parser.parseInline(tokens);
      return hasImage ? `<div class="blog-media">${body}</div>` : `<p>${body}</p>`;
    },
    table(token) {
      const headerCells = token.header.map(cell => `<th>${this.parser.parseInline(cell.tokens)}</th>`).join('');
      const bodyRows = token.rows.map(row => `<tr>${row.map(cell => `<td>${this.parser.parseInline(cell.tokens)}</td>`).join('')}</tr>`).join('');
      return `<div class="blog-table-scroll"><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
    },
    image({href, text}) {
      const asset = images.get(href);
      if (!asset) throw new Error(`Unknown blog image: ${href}`);
      const alt = escapeHtml(text);
      return `<img src="../${escapeHtml(asset.src)}" alt="${alt}" width="${asset.width}" height="${asset.height}" loading="lazy" decoding="async">`;
    },
  }});
  const html = sanitizeHtml(markdown.parser(tokens), {
    allowedTags: sanitizeHtml.defaults.allowedTags.filter(tag => tag !== 'h1').concat(['img']),
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'loading', 'decoding'],
      code: ['class'],
      div: ['class'],
      h2: ['id'],
      h3: ['id'],
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attributes) => ({tagName, attribs: {...attributes, target: '_blank', rel: 'noopener noreferrer'}}),
    },
  });
  const minutes = estimateReadingMinutes(parsed.content, language);
  return {metadata, cover, html, toc, minutes};
}

export async function loadBlogs() {
  let entries;
  try {
    entries = await readdir(blogsDirectory);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const markdownFiles = entries.filter(name => name.endsWith('.md')).sort();
  const baseNames = markdownFiles.filter(name => !name.endsWith('.en.md'));
  const englishFiles = new Set(markdownFiles.filter(name => name.endsWith('.en.md')));
  const baseSlugs = new Set(baseNames.map(name => basename(name, '.md')));
  for (const enFile of englishFiles) {
    const slug = enFile.slice(0, -'.en.md'.length);
    if (!baseSlugs.has(slug)) throw new Error(`English blog translation has no base post: ${enFile}`);
  }

  const posts = [];
  const assets = new Map();

  async function image(href) {
    const {path, src} = assetPath(href);
    if (!assets.has(path)) {
      const {width, height} = imageSize(await readFile(path));
      if (!width || !height) throw new Error(`Blog image dimensions are missing: ${href}`);
      assets.set(path, {src, width, height});
    }
    return assets.get(path);
  }

  for (const name of baseNames) {
    const slug = basename(name, '.md');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Invalid blog filename: ${name}`);
    const zh = await parsePostFile(name, {image, idPrefix: 'section-', language: 'zh'});
    const enName = `${slug}.en.md`;
    const en = englishFiles.has(enName)
      ? await parsePostFile(enName, {image, idPrefix: 'en-section-', language: 'en'})
      : null;

    posts.push({
      ...zh.metadata,
      slug,
      cover: zh.cover,
      html: zh.html,
      toc: zh.toc,
      en: en ? {
        title: en.metadata.title,
        summary: en.metadata.summary,
        author: en.metadata.author,
        html: en.html,
        toc: en.toc,
        minutes: en.minutes,
      } : null,
      localizedTitle: {zh: zh.metadata.title, en: en ? en.metadata.title : zh.metadata.title},
      localizedSummary: {zh: zh.metadata.summary, en: en ? en.metadata.summary : zh.metadata.summary},
      localizedAuthor: {zh: zh.metadata.author, en: en ? en.metadata.author : zh.metadata.author},
      readingTime: {
        zh: `约 ${zh.minutes} 分钟阅读`,
        en: `${en ? en.minutes : zh.minutes} min read`,
      },
    });
  }
  const timestamp = post => Date.parse(`${post.published_at}T00:00:00+08:00`);
  return posts.sort((a, b) => timestamp(b) - timestamp(a) || a.slug.localeCompare(b.slug));
}
