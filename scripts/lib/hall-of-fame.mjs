// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {readFile} from 'node:fs/promises';
import {marked} from 'marked';
import {z} from 'zod';

export const HALL_CATEGORY_IDS = ['open-source', 'advocacy'];

const login = z.string().regex(/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/i);
const entry = z.strictObject({
  name: z.string().min(1),
  github: login,
  bio: z.strictObject({zh: z.string().min(1), en: z.string().min(1)}),
  since: z.string().min(1),
  avatar: z.string().regex(/^assets\/ambassadors\/[A-Za-z0-9._-]+$/).optional(),
  zhihu: z.url().optional(),
});
const category = z.strictObject({
  id: z.enum(HALL_CATEGORY_IDS),
  entries: z.array(entry),
});
export const hallOfFameSchema = z.strictObject({
  categories: z.array(category).length(HALL_CATEGORY_IDS.length),
});

const categoryId = title => {
  if (title.includes('开源大使')) return 'open-source';
  if (title.includes('宣传大使')) return 'advocacy';
  return null;
};

const headerNames = ['姓名', 'GitHub', '介绍', '入选时间'];

export function validateHallOfFame(value) {
  const record = hallOfFameSchema.parse(value);
  if (new Set(record.categories.map(item => item.id)).size !== HALL_CATEGORY_IDS.length) {
    throw new Error('hall of fame categories must be unique.');
  }
  const logins = record.categories.flatMap(item => item.entries.map(person => person.github.toLowerCase()));
  if (logins.length !== new Set(logins).size) throw new Error('Duplicate hall of fame GitHub logins.');
  return record;
}

export async function loadHallOfFame() {
  const markdown = await readFile(new URL('../../site/hall-of-fame.md', import.meta.url), 'utf8');
  const tokens = marked.lexer(markdown);
  const categories = [];
  let current = null;

  for (const token of tokens) {
    if (token.type === 'heading' && token.depth === 2) {
      const id = categoryId(token.text.trim());
      if (!id) throw new Error('hall-of-fame.md needs MFCP 开源大使 and MFCP 宣传大使 sections.');
      if (categories.some(item => item.id === id)) throw new Error(`Duplicate hall of fame category: ${id}`);
      current = {id, entries: []};
      categories.push(current);
      continue;
    }
    if (token.type !== 'table' || !current) continue;
    const columns = token.header.map(cell => cell.text.trim());
    if (headerNames.some(name => !columns.includes(name))) {
      throw new Error(`hall-of-fame.md table needs columns: ${headerNames.join(', ')}.`);
    }
    const column = name => columns.indexOf(name);
    const englishBio = columns.indexOf('English bio');
    const avatar = columns.indexOf('头像');
    const zhihu = columns.indexOf('知乎');
    for (const row of token.rows) {
      const zh = row[column('介绍')]?.text.trim() ?? '';
      const avatarCell = avatar >= 0 ? row[avatar]?.text.trim() : '';
      const avatarPath = avatarCell && avatarCell !== '-' ? avatarCell : '';
      const zhihuCell = zhihu >= 0 ? row[zhihu]?.text.trim() : '';
      const zhihuUrl = zhihuCell && zhihuCell !== '-' ? zhihuCell : '';
      current.entries.push({
        name: row[column('姓名')]?.text.trim() ?? '',
        github: row[column('GitHub')]?.text.trim().replace(/^@/, '') ?? '',
        bio: {
          zh,
          en: englishBio >= 0 ? (row[englishBio]?.text.trim() || zh) : zh,
        },
        since: row[column('入选时间')]?.text.trim() ?? '',
        ...(avatarPath ? {avatar: avatarPath} : {}),
        ...(zhihuUrl ? {zhihu: zhihuUrl} : {}),
      });
    }
  }

  const record = validateHallOfFame({categories});
  return {categories: [...record.categories].sort(
    (a, b) => HALL_CATEGORY_IDS.indexOf(a.id) - HALL_CATEGORY_IDS.indexOf(b.id))};
}
