// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {mkdir, writeFile, copyFile, cp} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import nunjucks from 'nunjucks';
import {loadProgram, repositoryUrl} from './lib/pages.mjs';
import {copy, projects} from '../site/content.mjs';

const siteDirectory = fileURLToPath(new URL('../site/', import.meta.url));
const template = new nunjucks.Environment(new nunjucks.FileSystemLoader(siteDirectory), {autoescape: true, throwOnUndefined: true});
template.addFilter('date', value => new Intl.DateTimeFormat('zh-CN', {month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'}).format(new Date(value)));
template.addFilter('jsonScript', value => new nunjucks.runtime.SafeString(JSON.stringify(value).replaceAll('<', '\\u003c')));

export async function buildPages(directory = '.', {output = join(directory, 'site-dist'), sha} = {}) {
  sha ??= execFileSync('git', ['rev-parse', 'HEAD'], {cwd: directory, encoding: 'utf8'}).trim();
  const program = await loadProgram(directory, {sha});
  const html = template.render('index.njk', {copy, projects, program, repositoryUrl,
    payload: {copy}, siteUrl: 'https://processmission-intern.github.io/mission-forge/'});
  await mkdir(output, {recursive: true});
  await writeFile(join(output, 'index.html'), html);
  await writeFile(join(output, '.nojekyll'), '');
  for (const name of ['site.css', 'app.mjs']) await copyFile(join(siteDirectory, name), join(output, name));
  await cp(join(siteDirectory, 'assets'), join(output, 'assets'), {recursive: true});
  console.log(`Built MFCP website for ${program.stats.participants} contributors at ${sha}.`);
  return {program, html, output};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await buildPages(resolve(process.argv[2] || '.'));
