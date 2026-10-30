// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
export const REPOSITORY_ID = 1428030862;
export const DEFAULT_REPOSITORY = 'missionhub-oss/mfcp';

export function createClient(token, repository = DEFAULT_REPOSITORY) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid repository name.');
  if (!token) throw new Error('GitHub token is required.');
  const root = `repos/${repository}`;
  let verified;
  async function raw(path, method = 'GET', body) {
    const response = await fetch(`https://api.github.com/${path}`, {
      method, headers: {Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json'},
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      const error = new Error(`GitHub ${method} ${path}: ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return response.status === 204 ? null : response.json();
  }
  async function metadata() {
    verified ??= raw(root).then(repo => {
      if (repo.id !== REPOSITORY_ID) throw new Error('Repository identity mismatch.');
      return repo;
    });
    return verified;
  }
  async function request(path, method = 'GET', body) {
    await metadata();
    return raw(path, method, body);
  }
  async function list(path) {
    const result = [];
    for (let page = 1; ; page++) {
      const items = await request(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
      if (!Array.isArray(items)) throw new Error('Expected a paginated array.');
      result.push(...items);
      if (items.length < 100) return result;
    }
  }
  async function file(path, ref) {
    const entry = await request(`${root}/contents/${path}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`);
    if (entry.type !== 'file' || entry.encoding !== 'base64' || entry.size > 2_000_000) throw new Error(`Invalid data file: ${path}`);
    return {value: JSON.parse(Buffer.from(entry.content, 'base64').toString('utf8')), sha: entry.sha};
  }
  async function head() {
    const repo = await metadata();
    return (await request(`${root}/git/ref/heads/${repo.default_branch}`)).object.sha;
  }
  return {request, list, file, head, metadata, root, repository};
}
