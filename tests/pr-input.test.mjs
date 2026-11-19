// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient, REPOSITORY_ID } from '../scripts/lib/github.mjs';
import { gitBlobSha, readPrInput } from '../scripts/read-pr-input.mjs';

function startServer(handler) {
  return new Promise(resolve => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const {port} = server.address();
      resolve({server, baseUrl: `http://127.0.0.1:${port}`});
    });
  });
}

test('createClient retries transient GET failures and 502 responses without retrying POST', async () => {
  let getAttempts = 0;
  let postAttempts = 0;
  const {server, baseUrl} = await startServer((req, res) => {
    if (req.url === '/repos/missionhub-oss/mfcp') {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({id: REPOSITORY_ID, default_branch: 'main'}));
      return;
    }
    if (req.url === '/repos/missionhub-oss/mfcp/flaky' && req.method === 'GET') {
      getAttempts += 1;
      if (getAttempts === 1) {
        req.socket.destroy();
        return;
      }
      if (getAttempts === 2) {
        res.writeHead(502, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({message: 'Bad Gateway'}));
        return;
      }
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ok: true}));
      return;
    }
    if (req.url === '/repos/missionhub-oss/mfcp/write' && req.method === 'POST') {
      postAttempts += 1;
      res.writeHead(502, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({message: 'Bad Gateway'}));
      return;
    }
    res.writeHead(404).end();
  });
  try {
    const client = createClient('test-token', 'missionhub-oss/mfcp', {apiBaseUrl: baseUrl, maxGetAttempts: 4, retryDelayMs: 10});
    const result = await client.request(`${client.root}/flaky`);
    assert.deepEqual(result, {ok: true});
    assert.equal(getAttempts, 3);
    await assert.rejects(() => client.request(`${client.root}/write`, 'POST', {a: 1}), /502/);
    assert.equal(postAttempts, 1);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('readPrInput reuses verified local files and blob cache while rejecting tampered cache entries', async () => {
  await mkdir('.mfcp-runtime', {recursive: true});
  const sandbox = await mkdtemp('.mfcp-runtime/pr-input-test-');
  const localContent = Buffer.from('{"name":"mission-forge"}\n');
  const changedContent = Buffer.from('{"github_login":"alice","github_id":1}\n');
  const localSha = gitBlobSha(localContent);
  const changedSha = gitBlobSha(changedContent);
  await writeFile(join(sandbox, 'package.json'), localContent);

  const blobRequests = [];
  const {server, baseUrl} = await startServer((req, res) => {
    if (req.url === '/repos/missionhub-oss/mfcp') {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({id: REPOSITORY_ID, default_branch: 'main'}));
      return;
    }
    if (req.url === '/repos/missionhub-oss/mfcp/pulls/999') {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({
        state: 'open',
        mergeable: true,
        merge_commit_sha: 'a'.repeat(40),
        head: {sha: 'b'.repeat(40)},
        base: {sha: 'c'.repeat(40)},
      }));
      return;
    }
    if (req.url === `/repos/missionhub-oss/mfcp/git/trees/${'a'.repeat(40)}?recursive=1`) {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({
        truncated: false,
        tree: [
          {path: 'package.json', mode: '100644', type: 'blob', sha: localSha, size: localContent.length},
          {path: 'participants/alice.json', mode: '100644', type: 'blob', sha: changedSha, size: changedContent.length},
        ],
      }));
      return;
    }
    if (req.url?.startsWith('/repos/missionhub-oss/mfcp/git/blobs/')) {
      const sha = req.url.split('/').pop();
      blobRequests.push(sha);
      const buf = sha === changedSha ? changedContent : localContent;
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({encoding: 'base64', size: buf.length, content: buf.toString('base64')}));
      return;
    }
    res.writeHead(404).end();
  });

  try {
    const client = createClient('test-token', 'missionhub-oss/mfcp', {apiBaseUrl: baseUrl, retryDelayMs: 10});
    const localShas = new Map([['package.json', localSha]]);
    const runtimeDir = join(sandbox, 'runtime');

    const first = await readPrInput(client, 999, {cwd: sandbox, runtimeDir, localShas});
    assert.equal(first.reused_local, 1);
    assert.equal(first.reused_cache, 0);
    assert.equal(first.fetched_blobs, 1);
    assert.deepEqual(blobRequests, [changedSha]);
    assert.equal(await readFile(join(first.directory, 'participants/alice.json'), 'utf8'), changedContent.toString('utf8'));

    const second = await readPrInput(client, 999, {cwd: sandbox, runtimeDir, localShas});
    assert.equal(second.reused_local, 1);
    assert.equal(second.reused_cache, 1);
    assert.equal(second.fetched_blobs, 0);
    assert.equal(blobRequests.length, 1);

    // Tamper with cached blob to verify SHA check forces re-fetch.
    await writeFile(join(runtimeDir, 'blob-cache', changedSha), Buffer.alloc(changedContent.length, 0x20));
    const third = await readPrInput(client, 999, {cwd: sandbox, runtimeDir, localShas});
    assert.equal(third.fetched_blobs, 1);
    assert.equal(blobRequests.length, 2);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(sandbox, {recursive: true, force: true});
  }
});
