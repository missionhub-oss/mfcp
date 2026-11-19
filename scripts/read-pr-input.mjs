// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient, apiUsage } from './lib/github.mjs';

const ALLOWED_INPUT = /^(?:participants\/[a-z0-9-]+\.json|programs\/\d{4}\/(?:governance\.json|rules\/v\d+\.json)|scripts\/(?:lib\/)?[a-z0-9-]+\.mjs|site\/[a-z0-9-]+\.mjs|package\.json)$/;
const SHA1_HEX = /^[a-f0-9]{40}$/;

export function gitBlobSha(buffer) {
  return createHash('sha1').update(`blob ${buffer.length}\0`).update(buffer).digest('hex');
}

export function loadLocalBlobShas(cwd = '.') {
  const map = new Map();
  let output;
  try {
    output = execFileSync('git', ['ls-tree', '-r', '--full-tree', '-z', 'HEAD'], {cwd, encoding: 'utf8', maxBuffer: 20_000_000});
  } catch {
    return map;
  }
  for (const entry of output.split('\0')) {
    if (!entry) continue;
    const tab = entry.indexOf('\t');
    if (tab === -1) continue;
    const [mode, type, sha] = entry.slice(0, tab).split(' ');
    const path = entry.slice(tab + 1);
    if (mode === '100644' && type === 'blob' && SHA1_HEX.test(sha ?? '')) map.set(path, sha);
  }
  return map;
}

async function readVerifiedFile(path, expectedSha, expectedSize) {
  try {
    const content = await readFile(path);
    if (content.length === expectedSize && gitBlobSha(content) === expectedSha) return content;
  } catch {}
  return null;
}

export async function readPrInput(client, number, options = {}) {
  const cwd = options.cwd ?? '.';
  const runtimeDir = options.runtimeDir ?? join(cwd, '.mfcp-runtime');
  const cacheDir = join(runtimeDir, 'blob-cache');
  let pr;
  for (let attempt = 0; attempt < 4; attempt++) {
    pr = await client.request(`${client.root}/pulls/${number}`);
    if (pr.mergeable !== null) break;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  if (pr.state !== 'open' || !pr.mergeable || !pr.merge_commit_sha) throw new Error('PR needs an available, conflict-free proposed merge.');
  const tree = await client.request(`${client.root}/git/trees/${pr.merge_commit_sha}?recursive=1`);
  if (tree.truncated) throw new Error('Incomplete proposed merge tree.');
  const files = tree.tree.filter(file => ALLOWED_INPUT.test(file.path));
  if (files.length > 2000) throw new Error('Proposed input exceeds the file limit.');
  await mkdir(cacheDir, {recursive: true});
  const directory = await mkdtemp(join(runtimeDir, 'pr-input-'));
  const localShas = options.localShas ?? loadLocalBlobShas(cwd);
  let total = 0;
  let reusedLocal = 0;
  let reusedCache = 0;
  let fetchedBlobs = 0;
  for (const file of files) {
    if (file.type !== 'blob' || file.mode !== '100644' || !SHA1_HEX.test(file.sha ?? '') || file.size > 2_000_000) {
      throw new Error(`Unsupported input file: ${file.path}`);
    }
    total += file.size;
    if (total > 20_000_000) throw new Error('Proposed input exceeds the byte limit.');
    let content = null;
    if (localShas.get(file.path) === file.sha) {
      content = await readVerifiedFile(join(cwd, file.path), file.sha, file.size);
      if (content !== null) reusedLocal += 1;
    }
    const cachePath = join(cacheDir, file.sha);
    if (content === null) {
      content = await readVerifiedFile(cachePath, file.sha, file.size);
      if (content !== null) reusedCache += 1;
    }
    if (content === null) {
      const blob = await client.request(`${client.root}/git/blobs/${file.sha}`);
      if (blob.encoding !== 'base64' || blob.size !== file.size) throw new Error(`Invalid blob: ${file.path}`);
      content = Buffer.from(blob.content, 'base64');
      if (content.length !== file.size || gitBlobSha(content) !== file.sha) throw new Error(`Invalid blob: ${file.path}`);
      fetchedBlobs += 1;
      await writeFile(cachePath, content, {flag: 'wx'}).catch(error => {
        if (error.code !== 'EEXIST') throw error;
      });
    }
    const target = join(directory, file.path);
    await mkdir(dirname(target), {recursive: true});
    await writeFile(target, content, {flag: 'wx'});
  }
  const latest = await client.request(`${client.root}/pulls/${number}`);
  if (latest.head.sha !== pr.head.sha || latest.base.sha !== pr.base.sha) throw new Error('PR changed while reading inputs; retry validation.');
  return {
    pr: number,
    head: pr.head.sha,
    merge: pr.merge_commit_sha,
    files: files.length,
    reused_local: reusedLocal,
    reused_cache: reusedCache,
    fetched_blobs: fetchedBlobs,
    directory,
    api: apiUsage(),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const number = Number(process.env.PR_NUMBER);
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error('A valid PR number is required.');
  const client = createClient(process.env.GITHUB_TOKEN, process.env.GITHUB_REPOSITORY);
  const result = await readPrInput(client, number);
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `directory=${result.directory}\n`);
  console.log(JSON.stringify(result));
}
