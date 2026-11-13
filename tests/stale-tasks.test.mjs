// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { staleTasks, staleNotice, STALE_DAYS, STALE_MARKER } from '../scripts/stale-tasks.mjs';

const now = new Date('2026-11-13T00:00:00Z');
const daysAgo = days => new Date(now.getTime() - days * 86_400_000).toISOString();
const task = overrides => ({
  number: 1,
  state: 'open',
  type: { name: 'Task' },
  assignees: [],
  created_at: daysAgo(STALE_DAYS + 1),
  ...overrides,
});

test('selects unassigned tasks older than thirty days', () => {
  const issues = [
    task({ number: 1, created_at: daysAgo(STALE_DAYS + 1) }),
    task({ number: 2, created_at: daysAgo(STALE_DAYS) }),
    task({ number: 3, created_at: daysAgo(STALE_DAYS + 1), assignees: [{ login: 'zevorn' }] }),
    task({ number: 4, created_at: daysAgo(STALE_DAYS + 1), type: { name: 'Bug' } }),
    task({ number: 5, created_at: daysAgo(STALE_DAYS + 1), state: 'closed' }),
    task({ number: 6, created_at: daysAgo(STALE_DAYS + 1), pull_request: { url: 'x' } }),
  ];
  assert.deepEqual(staleTasks(issues, now).map(issue => issue.number), [1]);
});

test('a notice states the cutoff, the age and a marker for one comment', () => {
  const notice = staleNotice(task({ created_at: daysAgo(31) }), now);
  assert.ok(notice.startsWith(STALE_MARKER));
  assert.match(notice, /31 days/);
  assert.match(notice, /2026-10-13/);
});
