// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {readFile} from 'node:fs/promises';
import {z} from 'zod';

export const communitySnapshotSchema = z.strictObject({
  members: z.number().int().nonnegative().safe(),
  observed_at: z.iso.datetime({offset: true}),
});

export async function loadCommunity() {
  return communitySnapshotSchema.parse(JSON.parse(await readFile(new URL('../../site/community.json', import.meta.url), 'utf8')));
}
