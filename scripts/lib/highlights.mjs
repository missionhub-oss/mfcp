// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {readFile, readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {z} from 'zod';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const localized = z.strictObject({en: z.string().min(1), zh: z.string().min(1)});
const project = z.strictObject({
  id: slug,
  name: localized,
  role: localized,
  summary: localized,
  url: z.url(),
});
const moment = z.strictObject({
  id: slug,
  at: z.iso.datetime({offset: true}),
  project: slug,
  kind: z.enum(['maintainer', 'reviewer', 'contributor']),
  title: localized,
  summary: localized,
  url: z.url(),
});

export const highlightsSchema = z.strictObject({
  github_id: z.number().int().positive().safe(),
  github_login: z.string().regex(/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/i),
  projects: z.array(project).nonempty(),
  moments: z.array(moment).nonempty(),
});

export function validateHighlights(value, path) {
  const record = highlightsSchema.parse(value);
  if (path !== `profiles/${record.github_login.toLowerCase()}.json`) {
    throw new Error('Highlights filename does not match username.');
  }
  const projectIds = record.projects.map(item => item.id);
  if (projectIds.length !== new Set(projectIds).size) throw new Error('Duplicate highlight project IDs.');
  const momentIds = record.moments.map(item => item.id);
  if (momentIds.length !== new Set(momentIds).size) throw new Error('Duplicate highlight moment IDs.');
  for (const item of record.moments) {
    if (!projectIds.includes(item.project)) throw new Error(`Unknown highlight project: ${item.project}`);
  }
  return record;
}

export async function loadHighlights(directory, participants) {
  let files;
  try {
    files = await readdir(join(directory, 'profiles'));
  } catch (error) {
    if (error.code === 'ENOENT') return new Map();
    throw error;
  }
  const byId = new Map(participants.map(person => [person.id, person]));
  const records = new Map();
  for (const file of files.filter(name => name.endsWith('.json')).sort()) {
    const path = `profiles/${file}`;
    const record = validateHighlights(JSON.parse(await readFile(join(directory, path), 'utf8')), path);
    const person = byId.get(record.github_id);
    if (!person || person.login.toLowerCase() !== record.github_login.toLowerCase()) {
      throw new Error('Highlights identity does not match a participant record.');
    }
    if (records.has(record.github_id)) throw new Error('Duplicate highlights records.');
    records.set(record.github_id, record);
  }
  return records;
}
