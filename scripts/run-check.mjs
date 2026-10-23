// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {fileURLToPath} from 'node:url';
import {reportCheckFailure} from './lib/check-report.mjs';

const [script, ...args] = process.argv.slice(2);
try {
  if (!/^[a-z][a-z0-9-]*\.mjs$/.test(script ?? '') || script === 'run-check.mjs') throw new Error('请指定 scripts/ 中的检查程序文件名。');
  const entry = new URL(script, import.meta.url);
  process.argv = [process.execPath, fileURLToPath(entry), ...args];
  await import(entry.href);
} catch (error) {
  await reportCheckFailure(process.env.GITHUB_WORKFLOW || script || 'Repository checks', error);
}
