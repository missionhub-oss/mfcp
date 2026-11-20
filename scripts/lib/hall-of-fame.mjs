// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {readFile} from 'node:fs/promises';
import {marked} from 'marked';
import {z} from 'zod';

export const HALL_TAGS = ['open-source', 'advocacy'];

const login = z.string().regex(/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/i);
const entry = z.strictObject({
  name: z.string().min(1),
  github: login,
  bio: z.strictObject({zh: z.string().min(1), en: z.string().min(1)}),
  tags: z.array(z.enum(HALL_TAGS)).nonempty(),
  since: z.string().min(1),
  avatar: z.string().regex(/^assets\/ambassadors\/[A-Za-z0-9._-]+$/).optional(),
  zhihu: z.url().optional(),
});
export const hallOfFameSchema = z.strictObject({entries: z.array(entry)});

const tagLabels = new Map([
  ['开源大使', 'open-source'],
  ['宣传大使', 'advocacy'],
]);
const headerNames = ['姓名', 'GitHub', '介绍', '标签', '入选时间'];

export function validateHallOfFame(value) {
  const record = hallOfFameSchema.parse(value);
  const logins = record.entries.map(person => person.github.toLowerCase());
  if (logins.length !== new Set(logins).size) throw new Error('Duplicate hall of fame GitHub logins.');
  return record;
}

export async function loadHallOfFame() {
  const markdown = await readFile(new URL('../../site/hall-of-fame.md', import.meta.url), 'utf8');
  const table = marked.lexer(markdown).find(token => token.type === 'table');
  if (!table) throw new Error('hall-of-fame.md needs an ambassador table.');

  const columns = table.header.map(cell => cell.text.trim());
  if (headerNames.some(name => !columns.includes(name))) {
    throw new Error(`hall-of-fame.md table needs columns: ${headerNames.join(', ')}.`);
  }
  const column = name => columns.indexOf(name);
  const englishBio = columns.indexOf('English bio');
  const avatar = columns.indexOf('头像');
  const zhihu = columns.indexOf('知乎');
  const entries = table.rows.map(row => {
    const zh = row[column('介绍')]?.text.trim() ?? '';
    const tagCell = row[column('标签')]?.text.trim() ?? '';
    const tags = [...new Set(tagCell.split(/[、,，/]/).map(tag => tag.trim()).filter(Boolean).map(tag => {
      const id = tagLabels.get(tag);
      if (!id) throw new Error(`Unknown hall of fame tag: ${tag}`);
      return id;
    }))];
    if (!tags.length) throw new Error('hall of fame entries need at least one tag.');
    const avatarCell = avatar >= 0 ? row[avatar]?.text.trim() : '';
    const avatarPath = avatarCell && avatarCell !== '-' ? avatarCell : '';
    const zhihuCell = zhihu >= 0 ? row[zhihu]?.text.trim() : '';
    const zhihuUrl = zhihuCell && zhihuCell !== '-' ? zhihuCell : '';
    return {
      name: row[column('姓名')]?.text.trim() ?? '',
      github: row[column('GitHub')]?.text.trim().replace(/^@/, '') ?? '',
      bio: {
        zh,
        en: englishBio >= 0 ? (row[englishBio]?.text.trim() || zh) : zh,
      },
      tags,
      since: row[column('入选时间')]?.text.trim() ?? '',
      ...(avatarPath ? {avatar: avatarPath} : {}),
      ...(zhihuUrl ? {zhihu: zhihuUrl} : {}),
    };
  });

  return validateHallOfFame({entries});
}
