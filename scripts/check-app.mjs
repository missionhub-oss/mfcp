// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { createAppAuth } from '@octokit/auth-app';
import { DEFAULT_REPOSITORY } from './lib/github.mjs';

const {values} = parseArgs({options: {'app-id': {type: 'string'}, 'private-key': {type: 'string'}}});
const auth = createAppAuth({appId: values['app-id'], privateKey: await readFile(values['private-key'], 'utf8')});
const {token} = await auth({type: 'app'});
const response = await fetch(`https://api.github.com/repos/${DEFAULT_REPOSITORY}/installation`, {
  headers: {Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json'},
});
if (!response.ok) throw new Error(`Installation check failed: HTTP ${response.status}`);
const installation = await response.json();
console.log(JSON.stringify({app_id: installation.app_id, installation_id: installation.id,
  account: installation.account.login, repository_selection: installation.repository_selection,
  suspended: Boolean(installation.suspended_at)}));
