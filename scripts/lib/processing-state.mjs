// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {mkdir, readFile, rename, writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';

export async function readProcessingState(path, schema) {
  if (!path) return schema.parse({});
  try {return schema.parse(JSON.parse(await readFile(path, 'utf8')));}
  catch (error) {if (error.code === 'ENOENT') return schema.parse({}); throw error;}
}

export async function saveProcessingState(path, state, schema) {
  if (!path) return;
  const checked = schema.parse(state);
  await mkdir(dirname(path), {recursive: true});
  const temporary = `${path}.${process.pid}.pending`;
  await writeFile(temporary, JSON.stringify(checked, null, 2) + '\n');
  await rename(temporary, path);
}

export function isRateLimited(error) {
  if (!error) return false;
  return error.status === 429 || error.status === 403 &&
    (error.rateLimitRemaining === '0' || /rate limit/i.test(error.message ?? '')) ||
    isRateLimited(error.cause);
}

export function overlapSince(value) {
  return value ? new Date(Date.parse(value) - 60_000).toISOString() : null;
}
