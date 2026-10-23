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
    return `## Check failed\n\n<pre>${escapeHtml(error.message || String(error))}</pre>\n\n[Contribution guide](${guide})\n`;
  }
  let report = `## Commit validation failed\n\nFound ${error.problems.length} issue${error.problems.length === 1 ? '' : 's'}. Update the commit metadata below.\n\n`;
  let shown = 0;
  for (const problem of error.problems) {
    const location = problemLocation(problem);
    const link = /^[a-f0-9]{40}$/.test(problem.commit ?? '') ? `${root}/commit/${problem.commit}`
      : Number.isSafeInteger(problem.pr) ? `${root}/pull/${problem.pr}` : null;
    const heading = link ? `[${escapeHtml(location)}](${link})` : escapeHtml(location);
    const section = `### ${heading}\n\n${escapeHtml(problem.message)}\n\n` +
      (problem.excerpt ? `<pre>${escapeHtml(problem.excerpt)}</pre>\n\n` : '') +
      `How to fix: ${escapeHtml(problem.fix)}\n\n`;
    if (Buffer.byteLength(report + section, 'utf8') > 55_000) break;
    report += section;
    shown++;
  }
  if (shown < error.problems.length) report += `See the full check log for ${error.problems.length - shown} additional issue${error.problems.length - shown === 1 ? '' : 's'}.\n\n`;
  report += '### Update the PR\n\nEdit the PR title on GitHub. The original author should edit the latest commit with `git commit --amend`, ' +
    'or use `git rebase -i` to edit earlier commits. After confirming their DCO, sign with `git commit --amend -s`. ' +
    'Push the update with `git push --force-with-lease`; CI will validate the updated commits.\n\n' +
    `[Commit format and DCO requirements](${guide})\n`;
  return report;
}

export async function reportCheckFailure(name, error) {
  process.exitCode = 1;
  if (error instanceof CommitPolicyError) {
    for (const problem of error.problems) core.error(problemText(problem), {title: `${name}: ${problemLocation(problem)}`});
  } else core.error(error.message || String(error), {title: name});
  core.debug(error.stack || String(error));
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      await core.summary.addRaw(formatCheckFailure(error, process.env.GITHUB_REPOSITORY || DEFAULT_REPOSITORY)).write();
    } catch (failure) {
      core.warning(`Could not write the check summary; see the error annotations above: ${failure.message}`);
    }
  }
}
