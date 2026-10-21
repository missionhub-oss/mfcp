// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import { isBotCommand, parseCommand } from './commands.mjs';
import { digest, equal, activeSettlement } from './profile.mjs';
import { readProfiles } from './progression.mjs';
import { isTrustedBotComment } from './bot-identity.mjs';
import { reactionForOutcome, setCommandReaction } from './command-reactions.mjs';

const inline = value => String(value).replaceAll('`', "'").replaceAll('@', '＠')
  .replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(/\s+/g, ' ').slice(0, 500);
const marker = id => `<!-- mfcp-command:${id} -->`;

export function errorOutcome(error) {
  const reason = Array.isArray(error.issues)
    ? error.issues.slice(0, 3).map(issue => `${issue.path.join('.') || 'command'}: ${issue.message}`).join('; ')
    : error.message;
  const waiting = error.status === 429 || error.status >= 500 ||
    /^(Candidate checks are pending|Main changed repeatedly)/.test(reason ?? '');
  return {status: waiting ? 'waiting' : 'failed', reason: reason || 'Command processing could not be completed.'};
}

export function formatCommandFeedback(comment, outcome, repository) {
  if (!/^[a-z0-9-]{1,39}$/i.test(comment.user.login)) throw new Error('Invalid command author.');
  const source = `[your command](${comment.html_url})`;
  let success = false, title, detail;
  switch (outcome.status) {
    case 'assigned':
      success = true;
      title = '✅ Assignment confirmed';
      detail = `Assignee: \`${inline(outcome.assignee)}\`.`;
      break;
    case 'published':
      success = true;
      title = '✅ Command completed';
      detail = ({configure: 'Mentor configuration saved.', stage: 'Stage acceptance recorded.',
        settle: 'Experience settlement recorded.', promote: 'Promotion recorded.'})[outcome.action] || 'The change is recorded.';
      if (outcome.participant) detail += ` Contributor: \`${inline(outcome.participant)}\`.`;
      if (outcome.commit && outcome.path) detail += `\n\n[View the recorded change](https://github.com/${repository}/blob/${outcome.commit}/${outcome.path}).`;
      break;
    case 'evidence-recorded':
      success = true;
      title = '✅ Assessment recorded';
      detail = 'The command and author are valid. Use this comment as promotion evidence; promotion still requires its own checks and reviews.';
      break;
    case 'already-merged':
      success = true;
      title = '✅ Review PR merged';
      detail = `[View the merged PR](${outcome.url}).`;
      break;
    case 'awaiting-review':
    case 'auto-merge-enabled':
      title = '⏳ Waiting for the review PR';
      detail = `[View the PR](${outcome.url}). ` + (outcome.status === 'auto-merge-enabled'
        ? 'Auto-merge is enabled; the change takes effect after merge.'
        : 'Authorized reviews of the current revision are required before the change takes effect.');
      break;
    case 'review-declined':
      title = '❌ Review PR closed without merging';
      detail = `[View the PR](${outcome.url}). This proposal has not been applied.`;
      break;
    case 'waiting':
      title = '⏳ Waiting for completion';
      detail = `\`${inline(outcome.reason)}\``;
      break;
    case 'no-change':
      title = 'ℹ️ No new change';
      detail = `\`${inline(outcome.reason)}\``;
      break;
    default:
      title = '❌ Command needs attention';
      detail = `Reason: \`${inline(outcome.reason || 'Command processing could not be completed.')}\`\n\n` +
        'Review the current issue state and post a new command after correcting the problem. [Command guide]' +
        `(https://github.com/${repository}/blob/main/docs/bot-command-examples.md).`;
  }
  return `${title} — @${comment.user.login}, this is the result of ${source}.\n\n${detail}\n\n` +
    `${marker(comment.id)}\n<!-- mfcp-command-result:${digest(comment.body)}:${success ? 'success' : outcome.status} -->`;
}

function matchesProof(proof, source, body) {
  if (equal(proof.source, source)) return proof.digest === digest(body);
  if (proof.source.kind !== 'completed' || proof.source.issue !== source.issue) return false;
  const details = JSON.parse(proof.details);
  return details.evidence_comment === source.comment && proof.digest === digest({event: proof.source.event, evidence: digest(body)});
}

async function explainUnchanged(client, source, comment) {
  const command = parseCommand(comment.body, process.env.MFCP_APP_SLUG);
  const issue = await client.request(`${client.root}/issues/${source.issue}`);
  if (command.action === 'assign') {
    if (issue.assignees.length === 1 && issue.assignees[0].login.toLowerCase() === command.data.assignee.toLowerCase()) {
      return {status: 'assigned', assignee: issue.assignees[0].login};
    }
    return {status: 'no-change', reason: issue.state === 'closed' ? 'The task is closed.' :
      'A later GitHub assignment change superseded this command. Check Assignees before posting a new request.'};
  }
  const ref = await client.head();
  const profiles = await readProfiles(client, ref);
  for (const {path, profile} of profiles) {
    const proofs = [...profile.promotions.map(event => event.proof), ...profile.contributions.flatMap(task =>
      [task.configuration, ...task.stages.map(stage => stage.proof), ...task.settlements.map(settlement => settlement.proof)])];
    if (proofs.some(proof => matchesProof(proof, source, comment.body))) {
      return {status: 'published', action: command.action, participant: profile.github_login, commit: ref, path};
    }
  }
  if (command.action === 'settle') {
    const owner = profiles.find(record => record.profile.contributions.some(task => task.issue === source.issue));
    if (!owner) return {status: 'failed', reason: 'Configure this task and its mentor before requesting settlement.'};
    const task = owner.profile.contributions.find(task => task.issue === source.issue);
    if (activeSettlement(owner.profile, task)) return {status: 'no-change', reason: 'This task is already credited. No additional experience was awarded.'};
    if (issue.state === 'open') return {status: 'waiting', reason: 'Settlement evidence received. After acceptance, a maintainer must close the task as Completed to award experience.'};
    if (issue.state_reason !== 'completed') return {status: 'no-change', reason: 'Only tasks closed as Completed can receive experience.'};
  }
  return {status: 'no-change', reason: 'No new change was required. Check the current issue and contributor record.'};
}

export async function replyToCommand(client, source, result, error) {
  const appId = Number(process.env.MFCP_APP_ID);
  if (!Number.isSafeInteger(appId) || appId <= 0) throw new Error('MFCP_APP_ID is required for command replies.');
  let comment;
  try {comment = await client.request(`${client.root}/issues/comments/${source.comment}`);}
  catch (failure) {if (failure.status === 404) return {status: 'source-removed'}; throw failure;}
  if (comment.user.type !== 'User' || !isBotCommand(comment.body, process.env.MFCP_APP_SLUG)) return {status: 'not-a-command'};
  if (comment.issue_url !== `https://api.github.com/${client.root}/issues/${source.issue}`) throw new Error('Reply source issue mismatch.');
  const comments = await client.list(`${client.root}/issues/${source.issue}/comments`);
  const previous = comments.find(item => isTrustedBotComment(item, appId) && item.body?.includes(marker(comment.id)));
  if (previous?.body.includes(`<!-- mfcp-command-result:${digest(comment.body)}:success -->`)) {
    await setCommandReaction(client, source, '+1');
    return {status: 'already-replied', url: previous.html_url};
  }
  const edited = comment.created_at !== comment.updated_at;
  const outcome = edited ? errorOutcome(new Error('This command comment was edited. Check the current state and post a new command.'))
    : error ? errorOutcome(error) : result.status === 'unchanged'
    ? await explainUnchanged(client, source, comment) : result;
  const reaction = await setCommandReaction(client, source, reactionForOutcome(outcome.status), {preserveSuccess: !edited});
  if (reaction === '+1' && !previous) return {status: 'success-reaction', content: '+1'};
  if (reaction === '+1' && reactionForOutcome(outcome.status) !== '+1') return {status: 'already-succeeded'};
  const body = formatCommandFeedback(comment, outcome, (await client.metadata()).full_name);
  if (previous?.body === body) return {status: 'already-replied', url: previous.html_url};
  const posted = previous
    ? await client.request(`${client.root}/issues/comments/${previous.id}`, 'PATCH', {body})
    : await client.request(`${client.root}/issues/${source.issue}/comments`, 'POST', {body});
  return {status: previous ? 'reply-updated' : 'replied', url: posted.html_url};
}
