// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir, mkdtemp, readdir, readFile, copyFile, rm} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {readProfileSnapshot} from '../scripts/lib/profile-snapshot.mjs';
import {normalizeProfile} from '../scripts/lib/profile.mjs';
import {notificationsFor} from '../scripts/lib/notifications.mjs';

test('notification snapshots use committed profiles despite index and checkout changes', async () => {
  const expected = [];
  for (const name of (await readdir('participants')).filter(name => /^[a-z0-9-]+\.json$/.test(name)).sort()) {
    const path = `participants/${name}`;
    expected.push({path, profile: normalizeProfile(JSON.parse(await readFile(path, 'utf8')), path)});
  }
  const ref = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
  await mkdir('.mfcp-runtime', {recursive: true});
  const directory = await mkdtemp('.mfcp-runtime/profile-snapshot-');
  try {
    execFileSync('git', ['clone', '--quiet', '--shared', '--no-checkout', resolve('.'), directory]);
    const snapshot = readProfileSnapshot(directory);
    assert.equal(snapshot.ref, ref);
    assert.deepEqual(snapshot.profiles, expected);
    assert.deepEqual(snapshot.profiles.flatMap(record => notificationsFor(record.profile)),
      expected.flatMap(record => notificationsFor(record.profile)));

    execFileSync('git', ['checkout', '--quiet', 'HEAD', '--', 'participants/'], {cwd: directory});
    const [first, second] = expected;
    await copyFile(join(directory, second.path), join(directory, first.path));
    execFileSync('git', ['add', '--', first.path], {cwd: directory});
    await rm(join(directory, second.path));
    await copyFile(join(directory, first.path), join(directory, 'participants/untracked.json'));
    assert.deepEqual(readProfileSnapshot(directory), snapshot);
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});
