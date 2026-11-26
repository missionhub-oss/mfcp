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
export const defaultJobsDirectory = resolve(rootDirectory, 'jobs');

const httpUrl = z.url().refine(value => {
  const {protocol} = new URL(value);
  return protocol === 'http:' || protocol === 'https:';
}, {message: 'Job apply_url must use http or https.'});

const schema = z.strictObject({
  title: z.string().min(1),
  company: z.string().min(1),
  summary: z.string().min(1),
  location: z.string().min(1),
  employment_type: z.enum(['full-time', 'intern', 'part-time', 'contract']),
  work_mode: z.enum(['onsite', 'hybrid', 'remote']).optional(),
  salary: z.string().min(1).optional(),
  experience: z.string().min(1).optional(),
  status: z.enum(['open', 'closed']).default('open'),
  published_at: z.iso.date(),
  updated_at: z.iso.date().optional(),
  tags: z.array(z.string().min(1)).default([]),
  apply_url: httpUrl.optional(),
  apply_email: z.email().optional(),
  featured: z.boolean().default(false),
});

function assetPath(href, jobsDirectory) {
  if (/[?#]/.test(href)) throw new Error(`Job images must use a local asset path: ${href}`);
  const path = resolve(jobsDirectory, href);
  const publicPath = relative(jobsDirectory, path).split(sep).join('/');
  if (!publicPath.startsWith('assets/')) throw new Error(`Job image is outside jobs/assets: ${href}`);
  return {path, src: publicPath};
}

function rejectExecutableFrontMatter() {
  throw new Error('Job front matter must use YAML.');
}

function plainTextFromTokens(tokens = []) {
  let result = '';
  for (const token of tokens) {
    if (token.tokens) result += plainTextFromTokens(token.tokens);
    else if (typeof token.text === 'string') result += token.text;
  }
  return result.trim();
}

async function parseJobFile(name, {jobsDirectory, image, idPrefix}) {
  const raw = await readFile(resolve(jobsDirectory, name), 'utf8');
  const parsed = matter(raw, {engines: {javascript: rejectExecutableFrontMatter, js: rejectExecutableFrontMatter}});
  const metadata = schema.parse(parsed.data);
  if (!parsed.content.trim()) throw new Error(`Job posting is empty: ${name}`);
  const images = new Map();
  const toc = [];
  let headingIndex = 0;
  const markdown = new Marked({gfm: true});
  const tokens = markdown.lexer(parsed.content);
  const imageSources = new Set();
  markdown.walkTokens(tokens, token => {
    if (token.type === 'image') imageSources.add(token.href);
    if (token.type === 'heading' && token.depth === 1) throw new Error(`Put the job title in front matter: ${name}`);
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
      return hasImage ? `<div class="job-media">${body}</div>` : `<p>${body}</p>`;
    },
    table(token) {
      const headerCells = token.header.map(cell => `<th>${this.parser.parseInline(cell.tokens)}</th>`).join('');
      const bodyRows = token.rows.map(row => `<tr>${row.map(cell => `<td>${this.parser.parseInline(cell.tokens)}</td>`).join('')}</tr>`).join('');
      return `<div class="job-table-scroll"><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
    },
    image({href, text}) {
      const asset = images.get(href);
      if (!asset) throw new Error(`Unknown job image: ${href}`);
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
  return {metadata, html, toc};
}

function localizedField(zhValue, enValue) {
  if (!zhValue && !enValue) return null;
  const fallback = zhValue ?? enValue;
  return {zh: zhValue ?? fallback, en: enValue ?? fallback};
}

export async function loadJobs(jobsDirectory = defaultJobsDirectory) {
  const directory = resolve(jobsDirectory);
  let entries;
  try {
    entries = await readdir(directory);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const markdownFiles = entries.filter(name => name.endsWith('.md') && name.toLowerCase() !== 'readme.md').sort();
  const baseNames = markdownFiles.filter(name => !name.endsWith('.en.md'));
  const englishFiles = new Set(markdownFiles.filter(name => name.endsWith('.en.md')));
  const baseSlugs = new Set(baseNames.map(name => basename(name, '.md')));
  for (const enFile of englishFiles) {
    const slug = enFile.slice(0, -'.en.md'.length);
    if (!baseSlugs.has(slug)) throw new Error(`English job translation has no base posting: ${enFile}`);
  }

  const jobs = [];
  const assets = new Map();

  async function image(href) {
    const {path, src} = assetPath(href, directory);
    if (!assets.has(path)) {
      const {width, height} = imageSize(await readFile(path));
      if (!width || !height) throw new Error(`Job image dimensions are missing: ${href}`);
      assets.set(path, {src, width, height});
    }
    return assets.get(path);
  }

  for (const name of baseNames) {
    const slug = basename(name, '.md');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Invalid job filename: ${name}`);
    const zh = await parseJobFile(name, {jobsDirectory: directory, image, idPrefix: 'section-'});
    const enName = `${slug}.en.md`;
    const en = englishFiles.has(enName)
      ? await parseJobFile(enName, {jobsDirectory: directory, image, idPrefix: 'en-section-'})
      : null;

    jobs.push({
      ...zh.metadata,
      slug,
      html: zh.html,
      toc: zh.toc,
      en: en ? {
        title: en.metadata.title,
        company: en.metadata.company,
        summary: en.metadata.summary,
        location: en.metadata.location,
        salary: en.metadata.salary ?? null,
        experience: en.metadata.experience ?? null,
        tags: en.metadata.tags,
        html: en.html,
        toc: en.toc,
      } : null,
      localizedTitle: localizedField(zh.metadata.title, en?.metadata.title),
      localizedCompany: localizedField(zh.metadata.company, en?.metadata.company),
      localizedSummary: localizedField(zh.metadata.summary, en?.metadata.summary),
      localizedLocation: localizedField(zh.metadata.location, en?.metadata.location),
      localizedSalary: localizedField(zh.metadata.salary, en?.metadata.salary),
      localizedExperience: localizedField(zh.metadata.experience, en?.metadata.experience),
    });
  }

  const timestamp = job => Date.parse(`${job.published_at}T00:00:00+08:00`);
  return jobs.sort((a, b) =>
    Number(a.status === 'closed') - Number(b.status === 'closed')
    || Number(b.featured) - Number(a.featured)
    || timestamp(b) - timestamp(a)
    || a.slug.localeCompare(b.slug));
}
