// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import { marked } from 'marked';
import { parseArgsStringToArgv } from 'string-argv';
import { z } from 'zod';

const person = z.string().regex(/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/i);
const url = z.url().refine(value => new URL(value).protocol === 'https:', 'Use HTTPS evidence links.');
const level = z.union([z.literal(3), z.literal(4)]);
const summary = z.string().min(10);
const schemas = {
  configure: z.strictObject({mentor: z.string().regex(/^@?[a-z0-9-]{1,39}$/i)}),
  assign: z.strictObject({assignee: person}),
  stage: z.strictObject({stage: z.enum(['reproduced', 'validated']), evidence: z.array(url).nonempty()}),
  settle: z.strictObject({pull_requests: z.array(url).nonempty()}),
  endorse: z.strictObject({participant: person, level, passed: z.literal(true), summary}),
  interview: z.strictObject({participant: person, level: z.literal(3), passed: z.literal(true), summary, reference: url}),
  recommend: z.strictObject({participant: person, level: z.literal(4), passed: z.literal(true), summary, evidence: z.array(url).nonempty()}),
  promote: z.strictObject({participant: person, level, summary, mentor_comment: url,
    interview_comment: url.optional(), recommendations: z.array(url)}),
};

function commandHeader(body, slug) {
  if (typeof body !== 'string') return null;
  const tokens = marked.lexer(body);
  const firstIndex = tokens.findIndex(token => token.type !== 'space');
  const first = tokens[firstIndex];
  if (first?.type !== 'paragraph') return null;
  const [line, ...following] = first.text.split('\n');
  const match = /^@([a-z0-9-]+)(?:\[bot\])?(?:\s+(.*))?$/i.exec(line.trim());
  if (!match || match[1].toLowerCase() !== slug?.toLowerCase()) return null;
  return {tokens, firstIndex, following, match};
}

export const isBotCommand = (body, slug) => Boolean(commandHeader(body, slug));

export function parseCommand(body, slug) {
  const header = commandHeader(body, slug);
  if (!header) return null;
  const {tokens, firstIndex, following, match} = header;
  if (tokens.some(token => token.type === 'code')) throw new Error('Use one short command line; evidence summaries go below it.');
  const words = parseArgsStringToArgv(match[2] ?? '');
  const [command, ...args] = words;
  const explanation = [...following, ...tokens.slice(firstIndex + 1).map(token => token.raw)].join('\n').trim();
  let action = command, data;
  if (command === 'configure') {
    if (args.length !== 2 || !['mentor', 'assignee'].includes(args[0])) throw new Error('Usage: configure mentor|assignee @username');
    if (args[0] === 'assignee') {
      action = 'assign';
      data = {assignee: args[1].replace(/^@/, '')};
    } else data = {mentor: args[1]};
  } else if (command === 'accept') {
    action = 'stage';
    const stages = {reproduction: 'reproduced', validation: 'validated'};
    data = {stage: stages[args[0]], evidence: args.slice(1)};
  } else if (command === 'settle') {
    data = {pull_requests: args};
  } else if (['endorse', 'interview', 'recommend', 'promote'].includes(command)) {
    if (!/^L[34]$/.test(args[1] ?? '')) throw new Error('Specify the candidate username and L3 or L4.');
    const candidate = {participant: args[0]?.replace(/^@/, ''), level: Number(args[1].slice(1)), summary: explanation};
    if (command === 'endorse') {
      if (args.length !== 2) throw new Error('Usage: endorse @username L3|L4, followed by a summary.');
      data = {...candidate, passed: true};
    } else if (command === 'interview') {
      if (args.length !== 3) throw new Error('Usage: interview @username L3 evidence-url, followed by a summary.');
      data = {...candidate, passed: true, reference: args[2]};
    } else if (command === 'recommend') {
      data = {...candidate, passed: true, evidence: args.slice(2)};
    } else {
      if (args[2] !== 'mentor') throw new Error('Specify mentor followed by the endorsement comment URL.');
      if (candidate.level === 3) {
        if (args.length !== 6 || args[4] !== 'interview') throw new Error('Usage: promote @username L3 mentor comment-url interview comment-url');
        data = {...candidate, mentor_comment: args[3], interview_comment: args[5], recommendations: []};
      } else {
        if (args[4] !== 'recommend' || args.length < 7) throw new Error('Usage: promote @username L4 mentor comment-url recommend comment-url comment-url');
        data = {...candidate, mentor_comment: args[3], recommendations: args.slice(5)};
      }
    }
  } else throw new Error('Supported commands: configure, accept, settle, endorse, interview, recommend, promote.');
  return {action, data: schemas[action].parse(data)};
}

export function taskSettings(issue) {
  if (issue.pull_request) throw new Error('Task commands belong on an issue.');
  const names = issue.labels.map(label => typeof label === 'string' ? label : label.name);
  if (!names.includes('kind/task')) throw new Error('The issue needs the kind/task label.');
  const difficulties = names.filter(name => name.startsWith('difficulty/'));
  const years = names.filter(name => /^\d{4}$/.test(name));
  if (difficulties.length !== 1 || !/^difficulty\/level[0-4]$/.test(difficulties[0])) throw new Error('Select exactly one difficulty/level0–4 label.');
  if (years.length !== 1 || !/^20\d{2}$/.test(years[0]) || Number(years[0]) < 2026) throw new Error('Select exactly one supported year label, such as 2026.');
  if (issue.assignees.length !== 1 || issue.assignees[0].type !== 'User') throw new Error('Assign the issue to exactly one contributor using GitHub Assignees.');
  return {participant_id: issue.assignees[0].id, difficulty: Number(difficulties[0].slice(-1)), year: Number(years[0])};
}
