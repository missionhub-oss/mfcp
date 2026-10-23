// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {execFileSync} from 'node:child_process';
import addresses from 'email-addresses';

const excerpt = value => {
  const characters = [...value];
  return JSON.stringify(characters.length > 240 ? characters.slice(0, 180).join('') + '…' + characters.slice(-60).join('') : value);
};

export function problemLocation(problem) {
  const target = problem.commit ? `Commit ${problem.commit.slice(0, 12)}` : problem.pr ? `PR #${problem.pr} title` : 'Commit message';
  return target + (problem.line ? `, line ${problem.line}` + (problem.column ? `, column ${problem.column}` : '') : ', final trailers');
}

export function problemText(problem) {
  return `${problemLocation(problem)}: ${problem.message}` +
    (problem.excerpt ? `\nActual content: ${problem.excerpt}` : '') + `\nHow to fix: ${problem.fix}`;
}

export class CommitPolicyError extends Error {
  constructor(problems) {
    super(`Commit validation found ${problems.length} issue${problems.length === 1 ? '' : 's'}:\n\n${problems.map(problemText).join('\n\n')}`);
    this.name = 'CommitPolicyError';
    this.problems = problems;
  }
}

function lineProblems(value, line) {
  const characters = [...value];
  const problems = [];
  const add = (code, message, fix, column) => problems.push({code, line, column, message, fix, excerpt: excerpt(value)});
  if (characters.length > 72) add('line-length', `This line contains ${characters.length} Unicode characters; the limit is 72.`, 'Wrap the body at 72 characters per line, or shorten the subject.');
  if (value.includes('\r')) add('carriage-return', 'Contains a carriage return (CR, U+000D), including CRLF line endings.', 'Save the commit message with LF line endings and remove any embedded CR characters.', characters.indexOf('\r') + 1);
  if (value.includes('\t')) add('tab', 'Contains a tab (TAB, U+0009).', 'Replace tabs with spaces and remove trailing whitespace.', characters.indexOf('\t') + 1);
  const withoutControls = value.replace(/[\r\t]+$/, '');
  if (/\s$/.test(withoutControls)) add('trailing-whitespace', 'This line ends with whitespace.', 'Remove spaces and other whitespace from the end of this line.', [...withoutControls.trimEnd()].length + 1);
  return problems;
}

function subjectProblems(subject) {
  const problems = lineProblems(subject, 1);
  if (!/^[a-z][a-z0-9/-]*: \S[^\r\n]*$/.test(subject.replace(/\r/g, ''))) {
    problems.push({code: 'subject-format', line: 1, message: 'The subject must use module: subject and fit on one line.',
      fix: 'Use a lowercase module name followed by a colon and a space, for example participants: register your-username.', excerpt: excerpt(subject)});
  }
  return problems;
}

export function validateSubject(subject) {
  const problems = subjectProblems(subject);
  if (problems.length) throw new CommitPolicyError(problems);
}

export function formatSignoff(name, email) {
  const signature = `Signed-off-by: ${name} <${email}>`;
  const result = [...signature].length <= 72 ? signature : `Signed-off-by: ${name}\n <${email}>`;
  if (result.split('\n').some(line => [...line].length > 72)) throw new Error('DCO identity does not fit within 72 characters.');
  return result;
}

export function validateCommitMessage(message, authorEmail, {commit} = {}) {
  const lines = message.replace(/\n$/, '').split('\n');
  const problems = subjectProblems(lines[0]);
  for (let index = 1; index < lines.length; index++) problems.push(...lineProblems(lines[index], index + 1));
  const content = lines.map(line => line.replace(/\r$/, ''));
  if (content[1] !== '') problems.push({code: 'body-separator', line: 2, message: 'A blank line is required between the subject and explanatory body.',
    fix: 'Insert a blank line after the subject, then describe the change and its purpose.', excerpt: excerpt(lines[1] ?? '')});
  if (!content[2]?.trim() || /^Signed-off-by:/i.test(content[2])) problems.push({code: 'body-missing', line: 3, message: 'The explanatory body is missing.',
    fix: 'Describe the change below the blank line after the subject, then leave another blank line before the DCO sign-off.'});
  // Inspect trailers independently of line-ending violations.
  const trailers = execFileSync('git', ['interpret-trailers', '--parse'], {input: message.replace(/\r\n/g, '\n'), encoding: 'utf8'});
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
  if (!matches) problems.push({code: 'author-signoff', message: signatures.length
    ? "The final Signed-off-by is invalid or does not match the commit author's email."
    : "The final trailers are missing the commit author's Signed-off-by.",
    fix: `Commit author email: ${authorEmail}. After confirming the DCO, the author must run git commit --amend -s with their own name and email configured. Maintainers must not sign for other authors.`});
  if (problems.length) throw new CommitPolicyError(problems.map(problem => ({...problem, commit})));
}

export async function validatePullRequestCommits(client, number) {
  const pr = await client.request(`${client.root}/pulls/${number}`);
  const problems = subjectProblems(pr.title).map(problem => ({...problem, pr: number}));
  if (pr.commits > 250) throw new Error('Split this PR: GitHub commit verification supports at most 250 commits.');
  const commits = await client.list(`${client.root}/pulls/${number}/commits`);
  if (!commits.length || commits.length !== pr.commits || commits.at(-1).sha !== pr.head.sha) throw new Error('Incomplete or changed PR commit list.');
  for (const commit of commits) {
    try {
      validateCommitMessage(commit.commit.message, commit.commit.author.email, {commit: commit.sha});
    } catch (error) {
      if (!(error instanceof CommitPolicyError)) throw error;
      problems.push(...error.problems);
    }
  }
  const latest = await client.request(`${client.root}/pulls/${number}`);
  if (latest.head.sha !== pr.head.sha || latest.title !== pr.title) throw new Error('PR changed during commit validation; rerun checks.');
  if (problems.length) throw new CommitPolicyError(problems);
  return {commits: commits.length};
}
