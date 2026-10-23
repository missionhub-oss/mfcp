// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {readFile} from 'node:fs/promises';
import {validateCommitMessage} from '../../scripts/lib/commit-policy.mjs';
import {reportCheckFailure} from '../../scripts/lib/check-report.mjs';

const commit = JSON.parse(await readFile(new URL('pr33-commit.json', import.meta.url), 'utf8'));
try {
  validateCommitMessage(commit.message, commit.author_email, {commit: commit.sha});
} catch (error) {
  await reportCheckFailure('Progression integrity', error);
}
