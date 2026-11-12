// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {readFile} from 'node:fs/promises';
import {marked} from 'marked';
import {z} from 'zod';

const replaySchema = z.object({
  title: z.object({en: z.string().min(1), zh: z.string().min(1)}),
  url: z.string().url(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration: z.string().regex(/^\d+:\d{2}$/),
});

export const eventsSchema = z.object({
  collection_url: z.string().url(),
  replays: z.array(replaySchema).nonempty(),
});

function findLinks(tokens = []) {
  return tokens.flatMap(token => {
    if (token.type === 'link') return [token];
    if (token.tokens) return findLinks(token.tokens);
    return [];
  });
}

export async function loadEvents() {
  const markdown = await readFile(new URL('../../site/events.md', import.meta.url), 'utf8');
  const tokens = marked.lexer(markdown);
  const table = tokens.find(token => token.type === 'table');
  if (!table) throw new Error('events.md needs a replay table.');

  const columns = table.header.map(cell => cell.text.trim());
  const required = ['日期', '中文标题', 'English title', '时长'];
  if (required.some(name => !columns.includes(name))) {
    throw new Error(`events.md table needs columns: ${required.join(', ')}.`);
  }
  const column = name => columns.indexOf(name);

  const replays = table.rows.map(row => {
    const titleCell = row[column('中文标题')];
    const link = findLinks(titleCell?.tokens)[0];
    if (!link) throw new Error('events.md replay titles need a markdown link.');
    return {
      title: {en: row[column('English title')].text.trim(), zh: link.text.trim()},
      url: link.href,
      date: row[column('日期')].text.trim(),
      duration: row[column('时长')].text.trim(),
    };
  });

  const collection = tokens
    .filter(token => token.type !== 'table')
    .flatMap(token => findLinks(token.tokens ?? []))
    .find(link => link.href.includes('bilibili.com/video/'));
  if (!collection) throw new Error('events.md needs a Bilibili collection link.');

  return eventsSchema.parse({collection_url: collection.href, replays});
}
