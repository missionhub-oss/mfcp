// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadHallOfFame, validateHallOfFame} from '../scripts/lib/hall-of-fame.mjs';

test('hall of fame Markdown loads tagged ambassadors', async () => {
  const {entries} = await loadHallOfFame();
  assert.equal(entries.length, 1);
  const luojia = entries[0];
  assert.equal(luojia.github, 'luojia65');
  assert.deepEqual(luojia.tags, ['open-source']);
  assert.ok(luojia.bio.zh && luojia.bio.en);
  assert.ok(luojia.since);
  assert.equal(luojia.avatar, 'assets/ambassadors/luojia65.png');
  assert.equal(luojia.zhihu, 'https://www.zhihu.com/people/luojia-14-40');
});

test('hall of fame rejects duplicate GitHub logins', async () => {
  const {entries} = await loadHallOfFame();
  const duplicate = structuredClone(entries);
  duplicate.push({...entries[0]});
  assert.throws(() => validateHallOfFame({entries: duplicate}), /Duplicate hall of fame GitHub logins/);
});
