// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
export const TASK_ISSUE_TYPE = 'Task';
export const isTaskIssue = issue => Boolean(issue && !issue.pull_request && issue.type?.name === TASK_ISSUE_TYPE);
