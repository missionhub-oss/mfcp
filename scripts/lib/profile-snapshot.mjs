// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {execFileSync} from 'node:child_process';
import {normalizeProfile} from './profile.mjs';

export function readProfileSnapshot(directory = '.') {
  const git = args => execFileSync('git', args, {cwd: directory, encoding: 'utf8', maxBuffer: 2_000_000});
  const ref = git(['rev-parse', '--verify', 'HEAD^{commit}']).trim();
  const entries = git(['ls-tree', '-r', '-z', '--full-tree', '--format=%(objectmode) %(path)', ref, '--', 'participants/']);
  const profiles = [];
  for (const entry of entries.split('\0').filter(Boolean)) {
    const mode = entry.slice(0, 6);
    const path = entry.slice(7);
    if (!/^participants\/[a-z0-9-]+\.json$/.test(path)) continue;
    if (mode !== '100644') throw new Error('Participant records must be regular files.');
    const value = JSON.parse(git(['cat-file', 'blob', `${ref}:${path}`]));
    profiles.push({path, profile: normalizeProfile(value, path)});
  }
  if (new Set(profiles.map(record => record.profile.github_id)).size !== profiles.length) {
    throw new Error('Duplicate participant identities.');
  }
  return {ref, profiles};
}
