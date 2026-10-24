// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import { appendFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createClient } from './lib/github.mjs';

const number = Number(process.env.PR_NUMBER);
if (!Number.isSafeInteger(number) || number <= 0) throw new Error('A valid PR number is required.');
const client = createClient(process.env.GITHUB_TOKEN, process.env.GITHUB_REPOSITORY);
let pr;
for (let attempt = 0; attempt < 4; attempt++) {
  pr = await client.request(`${client.root}/pulls/${number}`);
  if (pr.mergeable !== null) break;
  await new Promise(resolve => setTimeout(resolve, 2000));
}
if (pr.state !== 'open' || !pr.mergeable || !pr.merge_commit_sha) throw new Error('PR needs an available, conflict-free proposed merge.');
const tree = await client.request(`${client.root}/git/trees/${pr.merge_commit_sha}?recursive=1`);
if (tree.truncated) throw new Error('Incomplete proposed merge tree.');
const allowed = /^(?:participants\/[a-z0-9-]+\.json|programs\/\d{4}\/(?:governance\.json|rules\/v\d+\.json)|scripts\/(?:lib\/)?[a-z0-9-]+\.mjs|site\/[a-z0-9-]+\.mjs|package\.json)$/;
const files = tree.tree.filter(file => allowed.test(file.path));
if (files.length > 2000) throw new Error('Proposed input exceeds the file limit.');
await mkdir('.mfcp-runtime', {recursive: true});
const directory = await mkdtemp('.mfcp-runtime/pr-input-');
let total = 0;
for (const file of files) {
  if (file.type !== 'blob' || file.mode !== '100644' || file.size > 2_000_000) throw new Error(`Unsupported input file: ${file.path}`);
  total += file.size;
  if (total > 20_000_000) throw new Error('Proposed input exceeds the byte limit.');
  const blob = await client.request(`${client.root}/git/blobs/${file.sha}`);
  if (blob.encoding !== 'base64' || blob.size !== file.size) throw new Error(`Invalid blob: ${file.path}`);
  const target = join(directory, file.path);
  await mkdir(dirname(target), {recursive: true});
  await writeFile(target, Buffer.from(blob.content, 'base64'), {flag: 'wx'});
}
const latest = await client.request(`${client.root}/pulls/${number}`);
if (latest.head.sha !== pr.head.sha || latest.base.sha !== pr.base.sha) throw new Error('PR changed while reading inputs; retry validation.');
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `directory=${directory}\n`);
console.log(JSON.stringify({pr: number, head: pr.head.sha, merge: pr.merge_commit_sha, files: files.length, directory}));
