// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import { isBotCommand } from './commands.mjs';

export function reactionForOutcome(status) {
  if (['assigned', 'mentor-configured', 'published', 'evidence-recorded', 'already-merged'].includes(status)) return '+1';
  if (['processing', 'waiting', 'awaiting-review', 'auto-merge-enabled'].includes(status)) return 'eyes';
  return null;
}

export async function setCommandReaction(client, source, desired, {preserveSuccess = false} = {}) {
  const botId = Number(process.env.MFCP_BOT_ID);
  if (!Number.isSafeInteger(botId) || botId <= 0) throw new Error('MFCP_BOT_ID is required for command reactions.');
  const path = `${client.root}/issues/comments/${source.comment}/reactions`;
  const reactions = await client.list(path);
  const own = reactions.filter(reaction => reaction.user?.type === 'Bot' && reaction.user.id === botId);
  if (preserveSuccess && own.some(reaction => reaction.content === '+1')) desired = '+1';
  if (desired && !own.some(reaction => reaction.content === desired)) await client.request(path, 'POST', {content: desired});
  for (const reaction of own.filter(item => ['eyes', '+1'].includes(item.content) && item.content !== desired)) {
    try {await client.request(`${path}/${reaction.id}`, 'DELETE');}
    catch (error) {if (error.status !== 404) throw error;}
  }
  return desired;
}

export async function markCommandProcessing(client, source) {
  let comment;
  try {comment = await client.request(`${client.root}/issues/comments/${source.comment}`);}
  catch (error) {if (error.status === 404) return; throw error;}
  if (comment.user.type !== 'User' || !isBotCommand(comment.body, process.env.MFCP_APP_SLUG)) return;
  if (comment.issue_url !== `https://api.github.com/${client.root}/issues/${source.issue}`) throw new Error('Reaction source issue mismatch.');
  await setCommandReaction(client, source, 'eyes', {preserveSuccess: comment.created_at === comment.updated_at});
}
