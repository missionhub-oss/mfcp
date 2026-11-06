// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {readFile} from 'node:fs/promises';
import {z} from 'zod';

export const communitySnapshotSchema = z.strictObject({
  members: z.number().int().nonnegative().safe(),
  observed_at: z.iso.datetime({offset: true}),
});

export async function loadCommunity() {
  const snapshot = communitySnapshotSchema.parse(JSON.parse(await readFile(new URL('../../site/community.json', import.meta.url), 'utf8')));
  const options = {year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Shanghai'};
  return {...snapshot, observedLabel: Object.fromEntries(['en', 'zh'].map(language =>
    [language, new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en', options).format(new Date(snapshot.observed_at))]))};
}
