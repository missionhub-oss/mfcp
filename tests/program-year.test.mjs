// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {programYearAt, taskYear} from '../scripts/lib/program-year.mjs';

const catalog = JSON.parse(await readFile(new URL('../.github/labels.json', import.meta.url), 'utf8'));
const issue = {labels: catalog.filter(label => label.name === '2026')};

test('new task selection follows the Beijing year boundary and recorded tasks keep their year', () => {
  const before = '2026-12-31T15:59:59Z';
  const after = '2026-12-31T16:00:00Z';
  assert.equal(programYearAt(before), 2026);
  assert.equal(programYearAt(after), 2027);
  assert.equal(taskYear(issue, {at: before}), 2026);
  assert.throws(() => taskYear(issue, {at: after}), /2027 or later/);
  assert.equal(taskYear(issue, {at: after, recordedYear: 2026}), 2026);
  assert.throws(() => taskYear(issue, {at: after, recordedYear: 2027}), /2027 or later/);
});

test('mentor configuration can precede year selection and rejects ambiguous year labels', () => {
  assert.equal(taskYear({labels: []}, {required: false}), null);
  assert.throws(() => taskYear({labels: [...issue.labels, ...issue.labels]}), /exactly one/);
});
