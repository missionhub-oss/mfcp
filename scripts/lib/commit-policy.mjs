// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {execFileSync} from 'node:child_process';
import addresses from 'email-addresses';

const excerpt = value => {
  const characters = [...value];
  return JSON.stringify(characters.length > 240 ? characters.slice(0, 180).join('') + '…' + characters.slice(-60).join('') : value);
};

export function problemLocation(problem) {
  const target = problem.commit ? `提交 ${problem.commit.slice(0, 12)}` : problem.pr ? `PR #${problem.pr} 标题` : '提交说明';
  return target + (problem.line ? `，第 ${problem.line} 行` + (problem.column ? `，第 ${problem.column} 列` : '') : '，末尾签署');
}

export function problemText(problem) {
  return `${problemLocation(problem)}：${problem.message}` +
    (problem.excerpt ? `\n实际内容：${problem.excerpt}` : '') + `\n修复方法：${problem.fix}`;
}

export class CommitPolicyError extends Error {
  constructor(problems) {
    super(`提交检查发现 ${problems.length} 项问题：\n\n${problems.map(problemText).join('\n\n')}`);
    this.name = 'CommitPolicyError';
    this.problems = problems;
  }
}

function lineProblems(value, line) {
  const characters = [...value];
  const problems = [];
  const add = (code, message, fix, column) => problems.push({code, line, column, message, fix, excerpt: excerpt(value)});
  if (characters.length > 72) add('line-length', `本行有 ${characters.length} 个 Unicode 字符，超过 72 个字符的限制。`, '将正文拆成多行，每行最多 72 个字符；标题请缩短。');
  if (value.includes('\r')) add('carriage-return', '包含回车字符 CR（U+000D）；CRLF 换行也会触发此项。', '将提交说明保存为 LF 换行，并移除行内的 CR 字符。', characters.indexOf('\r') + 1);
  if (value.includes('\t')) add('tab', '包含制表符 TAB（U+0009）。', '使用空格替换制表符，并删除行尾空白。', characters.indexOf('\t') + 1);
  const withoutControls = value.replace(/[\r\t]+$/, '');
  if (/\s$/.test(withoutControls)) add('trailing-whitespace', '行尾包含空白字符。', '删除该行末尾的空格和其他空白字符。', [...withoutControls.trimEnd()].length + 1);
  return problems;
}

function subjectProblems(subject) {
  const problems = lineProblems(subject, 1);
  if (!/^[a-z][a-z0-9/-]*: \S[^\r\n]*$/.test(subject.replace(/\r/g, ''))) {
    problems.push({code: 'subject-format', line: 1, message: '标题需要使用 module: subject 格式，并保持为一行。',
      fix: '使用小写模块名、冒号和空格，例如 participants: register your-username。', excerpt: excerpt(subject)});
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
  if (content[1] !== '') problems.push({code: 'body-separator', line: 2, message: '标题与说明正文之间缺少空行。',
    fix: '在标题后插入一个空行，再填写修改内容和目的。', excerpt: excerpt(lines[1] ?? '')});
  if (!content[2]?.trim() || /^Signed-off-by:/i.test(content[2])) problems.push({code: 'body-missing', line: 3, message: '缺少说明修改内容和目的的正文。',
    fix: '在标题后的空行下面填写说明正文，再用空行分隔末尾 DCO 签署。'});
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
    ? '末尾 Signed-off-by 格式无效，或签署邮箱与提交作者邮箱不一致。'
    : '提交末尾缺少作者本人的 Signed-off-by。',
    fix: `提交作者邮箱为 ${authorEmail}。作者本人确认 DCO 后，在本人姓名和邮箱已正确配置的环境执行 git commit --amend -s。维护者不能代签其他作者。`});
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
