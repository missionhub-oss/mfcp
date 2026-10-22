// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {execFileSync} from 'node:child_process';
import addresses from 'email-addresses';

export function validateSubject(subject) {
  if (!/^[a-z][a-z0-9/-]*: \S[^\r\n]*$/.test(subject) || subject.trimEnd() !== subject || [...subject].length > 72) {
    throw new Error('Subject must use module: subject and fit within 72 characters.');
  }
}

export function formatSignoff(name, email) {
  const signature = `Signed-off-by: ${name} <${email}>`;
  const result = [...signature].length <= 72 ? signature : `Signed-off-by: ${name}\n <${email}>`;
  if (result.split('\n').some(line => [...line].length > 72)) throw new Error('DCO identity does not fit within 72 characters.');
  return result;
}

export function validateCommitMessage(message, authorEmail) {
  const lines = message.replace(/\n$/, '').split('\n');
  validateSubject(lines[0]);
  if (lines.some(line => [...line].length > 72 || /\s$/.test(line) || /[\r\t]/.test(line))) throw new Error('Every commit line must fit within 72 characters, without tabs or trailing whitespace.');
  if (lines[1] !== '' || !lines[2]?.trim() || /^Signed-off-by:/i.test(lines[2])) throw new Error('Separate the subject and explanatory body with a blank line.');
  const trailers = execFileSync('git', ['interpret-trailers', '--parse'], {input: message, encoding: 'utf8'});
  const signatures = trailers.split('\n').filter(line => line.startsWith('Signed-off-by: '));
  const matches = signatures.some(line => {
    const value = line.slice('Signed-off-by: '.length);
    const separator = value.lastIndexOf(' <');
    if (separator <= 0) return false;
    let mailbox = value.slice(separator);
    const githubBot = /^ <([0-9]+\+[a-z0-9-]+\[bot\])@users\.noreply\.github\.com>$/.exec(mailbox);
    if (githubBot) mailbox = ` <${JSON.stringify(githubBot[1])}@users.noreply.github.com>`;
    const parsed = addresses.parseOneAddress({input: `${JSON.stringify(value.slice(0, separator))}${mailbox}`, rfc6532: true});
    return parsed?.type === 'mailbox' && parsed.name?.trim() && parsed.address.toLowerCase() === authorEmail?.toLowerCase();
  });
  if (!matches) throw new Error('The final trailers must include the author’s own Signed-off-by name and commit-author email.');
}

export async function validatePullRequestCommits(client, number) {
  const pr = await client.request(`${client.root}/pulls/${number}`);
  validateSubject(pr.title);
  if (pr.commits > 250) throw new Error('Split this PR: GitHub commit verification supports at most 250 commits.');
  const commits = await client.list(`${client.root}/pulls/${number}/commits`);
  if (!commits.length || commits.length !== pr.commits || commits.at(-1).sha !== pr.head.sha) throw new Error('Incomplete or changed PR commit list.');
  for (const commit of commits) {
    try {
      validateCommitMessage(commit.commit.message, commit.commit.author.email);
    } catch (error) {throw new Error(`${commit.sha.slice(0, 12)}: ${error.message}`);}
  }
  const latest = await client.request(`${client.root}/pulls/${number}`);
  if (latest.head.sha !== pr.head.sha || latest.title !== pr.title) throw new Error('PR changed during commit validation; rerun checks.');
  return {commits: commits.length};
}
