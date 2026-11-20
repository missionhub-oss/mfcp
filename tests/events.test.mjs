// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadEvents, groupReplays, EVENTS_PER_GROUP} from '../scripts/lib/events.mjs';

test('event replays are ordered newest first', async () => {
  const {replays} = await loadEvents();
  assert.ok(replays.length > 1);
  for (let index = 0; index < replays.length - 1; index += 1) {
    assert.ok(replays[index].date >= replays[index + 1].date,
      `${replays[index].date} must not precede ${replays[index + 1].date}`);
  }
});

test('event replays are grouped six per view', () => {
  const replays = Array.from({length: 13}, (_, index) => ({date: `2026-01-${String(index + 1).padStart(2, '0')}`}));
  const groups = groupReplays(replays);
  assert.equal(EVENTS_PER_GROUP, 6);
  assert.deepEqual(groups.map(group => group.length), [6, 6, 1]);
  assert.equal(groups[0][0], replays[0]);
  assert.equal(groups[2][0], replays[12]);
  assert.throws(() => groupReplays(replays, 0), /positive integer/);
});
