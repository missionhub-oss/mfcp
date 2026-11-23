// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {isParticipantRename} from '../scripts/lib/progression.mjs';

const evidence = JSON.parse(await readFile(new URL('./fixtures/registration-rename-evidence.json', import.meta.url), 'utf8'));

test('a merged username rename needs no progression update', () => {
  const [file] = evidence.files;
  assert.equal(isParticipantRename(evidence.pr, evidence.files), true);
  assert.equal(isParticipantRename(evidence.pr, [{...file, status: 'added', previous_filename: undefined}]), false);
  assert.equal(isParticipantRename(evidence.pr, [{...file, status: 'modified'}]), false);
  assert.equal(isParticipantRename(evidence.pr, [{...file, previous_filename: 'docs/index.json'}]), false);
  assert.equal(isParticipantRename(evidence.pr, [{...file, filename: 'participants/other.json'}]), false);
  assert.equal(isParticipantRename({...evidence.pr, user: {...evidence.pr.user, login: 'other'}}, evidence.files), false);
  assert.equal(isParticipantRename(evidence.pr, [file, file]), false);
});
