// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import * as core from '@actions/core';
import escapeHtml from 'escape-html';
import {CommitPolicyError, problemLocation, problemText} from './commit-policy.mjs';
import {DEFAULT_REPOSITORY} from './github.mjs';

export function formatCheckFailure(error, repository = DEFAULT_REPOSITORY) {
  const root = `https://github.com/${repository}`;
  const guide = `${root}/blob/main/CONTRIBUTING.md#提交格式与-dco`;
  if (!(error instanceof CommitPolicyError)) {
    return `## 检查未通过\n\n<pre>${escapeHtml(error.message || String(error))}</pre>\n\n[贡献指南](${guide})\n`;
  }
  let report = `## 提交检查未通过\n\n发现 ${error.problems.length} 项问题，请修正以下提交信息。\n\n`;
  let shown = 0;
  for (const problem of error.problems) {
    const location = problemLocation(problem);
    const link = /^[a-f0-9]{40}$/.test(problem.commit ?? '') ? `${root}/commit/${problem.commit}`
      : Number.isSafeInteger(problem.pr) ? `${root}/pull/${problem.pr}` : null;
    const heading = link ? `[${escapeHtml(location)}](${link})` : escapeHtml(location);
    const section = `### ${heading}\n\n${escapeHtml(problem.message)}\n\n` +
      (problem.excerpt ? `<pre>${escapeHtml(problem.excerpt)}</pre>\n\n` : '') +
      `修复方法：${escapeHtml(problem.fix)}\n\n`;
    if (Buffer.byteLength(report + section, 'utf8') > 55_000) break;
    report += section;
    shown++;
  }
  if (shown < error.problems.length) report += `其余 ${error.problems.length - shown} 项问题请查看完整检查日志。\n\n`;
  report += '### 更新 PR\n\nPR 标题可在网页编辑。提交说明需要由原作者修改：最新提交使用 `git commit --amend`，' +
    '较早提交使用 `git rebase -i` 逐项修改；确认本人 DCO 时使用 `git commit --amend -s`。' +
    '修改后执行 `git push --force-with-lease`，CI 会检查更新后的提交。\n\n' +
    `[提交格式与 DCO 要求](${guide})\n`;
  return report;
}

export async function reportCheckFailure(name, error) {
  process.exitCode = 1;
  if (error instanceof CommitPolicyError) {
    for (const problem of error.problems) core.error(problemText(problem), {title: `${name}：${problemLocation(problem)}`});
  } else core.error(error.message || String(error), {title: name});
  core.debug(error.stack || String(error));
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      await core.summary.addRaw(formatCheckFailure(error, process.env.GITHUB_REPOSITORY || DEFAULT_REPOSITORY)).write();
    } catch (failure) {
      core.warning(`无法写入检查摘要，请查看上方错误注释：${failure.message}`);
    }
  }
}
