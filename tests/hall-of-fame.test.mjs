// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadHallOfFame, validateHallOfFame} from '../scripts/lib/hall-of-fame.mjs';

test('hall of fame Markdown loads tagged ambassadors', async () => {
  const {entries} = await loadHallOfFame();
  assert.equal(entries.length, 3);
  const luojia = entries.find(person => person.github === 'luojia65');
  assert.equal(luojia.name.zh, '蒋周奇（洛佳）');
  assert.equal(luojia.name.en, 'Zhouqi Jiang (Luo Jia)');
  assert.deepEqual(luojia.tags, ['open-source']);
  assert.ok(luojia.bio.zh && luojia.bio.en);
  assert.ok(luojia.since);
  assert.equal(luojia.avatar, 'assets/ambassadors/luojia65.jpg');
  assert.equal(luojia.zhihu, 'https://www.zhihu.com/people/luojia-14-40');
  const kunyuan = entries.find(person => person.github === 'kunyuanxu-star');
  assert.equal(kunyuan.name.zh, '徐堃元');
  assert.equal(kunyuan.name.en, 'Kunyuan Xu');
  assert.deepEqual(kunyuan.tags, ['advocacy']);
  assert.equal(kunyuan.avatar, 'assets/ambassadors/kunyuanxu-star.jpg');
  const wanglian = entries.find(person => person.github === 'lianux-mm');
  assert.equal(wanglian.name.zh, '王炼');
  assert.equal(wanglian.name.en, 'Lian Wang');
  assert.deepEqual(wanglian.tags, ['open-source']);
  assert.equal(wanglian.avatar, 'assets/ambassadors/lianux-mm.jpg');
});

test('hall of fame rejects duplicate GitHub logins', async () => {
  const {entries} = await loadHallOfFame();
  const duplicate = structuredClone(entries);
  duplicate.push({...entries[0]});
  assert.throws(() => validateHallOfFame({entries: duplicate}), /Duplicate hall of fame GitHub logins/);
});
