// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, mkdtemp, cp, readFile, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {loadProgram} from '../scripts/lib/pages.mjs';
import {validateHighlights} from '../scripts/lib/highlights.mjs';

test('open-source highlights reject unknown projects and duplicate IDs', async () => {
  const record = JSON.parse(await readFile('profiles/zevorn.json', 'utf8'));
  assert.equal(validateHighlights(record, 'profiles/zevorn.json').github_login, 'zevorn');

  const unknown = structuredClone(record);
  unknown.moments[0].project = 'unknown';
  assert.throws(() => validateHighlights(unknown, 'profiles/zevorn.json'), /Unknown highlight project/);

  const duplicate = structuredClone(record);
  duplicate.moments[1].id = duplicate.moments[0].id;
  assert.throws(() => validateHighlights(duplicate, 'profiles/zevorn.json'), /Duplicate highlight moment IDs/);

  assert.throws(() => validateHighlights(record, 'profiles/other.json'), /filename does not match/);
});

test('participant profiles expose declared projects and reverse-chronological moments', async () => {
  await mkdir('.mfcp-runtime', {recursive: true});
  const directory = await mkdtemp('.mfcp-runtime/highlights-');
  try {
    for (const name of ['participants', 'programs', 'profiles']) {
      await cp(name, join(directory, name), {recursive: true});
    }
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
    const {participants} = await loadProgram(directory, {sha, issues: [], repoStats: {stars: 0}});
    const zevorn = participants.find(person => person.login === 'zevorn');
    assert.ok(zevorn);
    assert.equal(zevorn.declaredProjects.length, 6);
    assert.equal(zevorn.moments.length, 9);
    assert.deepEqual(zevorn.moments.map(moment => moment.at),
      [...zevorn.moments.map(moment => moment.at)].sort((a, b) => Date.parse(b) - Date.parse(a)));
    assert.equal(zevorn.moments[0].id, 'linux-rv-docs-7-3');
    assert.equal(zevorn.moments.at(-1).id, 'openruyi-qemu-package');
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});
