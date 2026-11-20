// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadHallOfFame, validateHallOfFame} from '../scripts/lib/hall-of-fame.mjs';

test('hall of fame Markdown loads both ambassador categories', async () => {
  const {categories} = await loadHallOfFame();
  assert.deepEqual(categories.map(category => category.id), ['open-source', 'advocacy']);
  assert.equal(categories[0].entries.length, 1);
  assert.equal(categories[1].entries.length, 0);
  for (const person of categories[0].entries) {
    assert.match(person.github, /^[a-z0-9-]+$/i);
    assert.ok(person.bio.zh && person.bio.en);
    assert.ok(person.since);
  }
  const luojia = categories[0].entries.find(person => person.github === 'luojia65');
  assert.equal(luojia.avatar, 'assets/ambassadors/luojia65.png');
  assert.equal(luojia.zhihu, 'https://www.zhihu.com/people/luojia-14-40');
});

test('hall of fame rejects duplicate GitHub logins', async () => {
  const {categories} = await loadHallOfFame();
  const duplicate = structuredClone(categories);
  duplicate[1].entries.push({...duplicate[0].entries[0]});
  assert.throws(() => validateHallOfFame({categories: duplicate}), /Duplicate hall of fame GitHub logins/);
});
