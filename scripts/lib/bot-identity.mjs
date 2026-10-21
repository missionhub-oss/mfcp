// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
export function isTrustedBotComment(comment, appId = Number(process.env.MFCP_APP_ID), botId = Number(process.env.MFCP_BOT_ID)) {
  if (comment.user?.type !== 'Bot' || !Number.isSafeInteger(appId) || appId <= 0) return false;
  const application = comment.performed_via_github_app?.id;
  if (application != null) return application === appId;
  return Number.isSafeInteger(botId) && botId > 0 && comment.user.id === botId;
}
