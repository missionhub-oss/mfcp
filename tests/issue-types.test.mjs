// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {isTaskIssue} from '../scripts/lib/issue-types.mjs';
import {taskStats} from '../scripts/lib/task-stats.mjs';
import {taskSettings} from '../scripts/lib/commands.mjs';

const {task, untyped} = JSON.parse(await readFile(new URL('./fixtures/native-task-issues.json', import.meta.url), 'utf8'));

test('native Task identity controls statistics and command eligibility for recorded issues', () => {
  assert.equal(isTaskIssue(task), true);
  assert.equal(isTaskIssue(untyped), false);
  assert.deepEqual(taskStats([task, untyped]), {tasks: 1, inProgressTasks: 1, completedTasks: 0});
  assert.deepEqual(taskSettings(task, {at: task.updated_at}), {
    participant_id: task.assignees[0].id, difficulty: 1, year: 2026,
  });
  assert.throws(() => taskSettings(untyped, {at: untyped.updated_at}), /native issue type to Task/);
});
