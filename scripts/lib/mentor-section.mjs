// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {marked} from 'marked';

const start = '<!-- mfcp-mentor:start -->';
const end = '<!-- mfcp-mentor:end -->';
const reference = url => `<!-- mfcp-mentor-command: ${JSON.stringify(url)} -->`;

function section(body) {
  const tokens = marked.lexer(body ?? '');
  const starts = tokens.flatMap((token, index) => token.type === 'html' && token.raw.trim() === start ? [index] : []);
  const ends = tokens.flatMap((token, index) => token.type === 'html' && token.raw.trim() === end ? [index] : []);
  if (!starts.length && !ends.length) return null;
  if (starts.length !== 1 || ends.length !== 1 || starts[0] >= ends[0]) throw new Error('The MFCP Mentor section is malformed or duplicated.');
  return {tokens, first: starts[0], last: ends[0]};
}

function mentorField(body) {
  const tokens = marked.lexer(body);
  if (tokens.map(token => token.raw).join('') !== body) throw new Error('Issue Markdown cannot be safely updated without changing its formatting.');
  const headings = tokens.flatMap((token, index) => token.type === 'heading' && token.depth === 3 && token.text === 'Mentor / 导师' ? [index] : []);
  if (headings.length > 1) throw new Error('The issue has duplicate Mentor / 导师 fields.');
  if (!headings.length) return null;
  const first = headings[0];
  let last = first + 1;
  while (last < tokens.length && !(tokens[last].type === 'heading' && tokens[last].depth <= 3)) last++;
  const offset = tokens.slice(0, first + 1).reduce((sum, token) => sum + token.raw.length, 0);
  const length = tokens.slice(first + 1, last).reduce((sum, token) => sum + token.raw.length, 0);
  return {offset, length};
}

export function mergeMentorConfigurations(configurations, incoming) {
  const records = new Map();
  for (const configuration of incoming ? [...configurations, incoming] : configurations) {
    if (!Number.isSafeInteger(configuration.mentor.id) || configuration.mentor.id <= 0) throw new Error('A verified mentor GitHub ID is required.');
    if (!records.has(configuration.mentor.id)) records.set(configuration.mentor.id, configuration);
  }
  return [...records.values()];
}

export function mentorSection(configurations) {
  const records = mergeMentorConfigurations(configurations);
  if (!records.length) throw new Error('Configure at least one mentor.');
  const entries = records.map(({mentor, commandUrl}) => {
    const dco = mentor.signoffs?.length
      ? `DCO:\n\n${mentor.signoffs.map(signoff => `    Signed-off-by: ${signoff}`).join('\n')}\n\n` : '';
    return `Mentor: [@${mentor.login}](https://github.com/${mentor.login})\n\n${dco}${reference(commandUrl)}`;
  });
  return `${start}\n\n${entries.join('\n\n')}\n\n${end}\n`;
}

export function updateMentorSection(body, configurations) {
  body ??= '';
  const field = mentorField(body);
  const current = section(body);
  const replacement = mentorSection(configurations);
  if (!current) {
    if (!field) return `${body}${body ? '\n\n' : ''}### Mentor / 导师\n\n${replacement}`;
    let notes = body.slice(field.offset, field.offset + field.length).trim();
    if (notes === 'TBD' || notes === 'TBD.' || notes === '_No response_') notes = '';
    else if (notes.startsWith('TBD. ')) notes = notes.slice(5);
    return body.slice(0, field.offset) + '\n' + replacement + '\n' + (notes ? notes + '\n\n' : '') + body.slice(field.offset + field.length);
  }
  const {tokens, first, last} = current;
  const offset = tokens.slice(0, first).reduce((sum, token) => sum + token.raw.length, 0);
  const length = tokens.slice(first, last + 1).reduce((sum, token) => sum + token.raw.length, 0);
  if (!field || offset < field.offset || offset + length > field.offset + field.length) throw new Error('Bot-managed mentor details must stay inside Mentor / 导师.');
  const trailing = tokens[last].raw.slice(tokens[last].raw.indexOf(end) + end.length);
  return body.slice(0, offset) + replacement.trimEnd() + trailing + body.slice(offset + length);
}

export function readMentorCommands(body, {required = true} = {}) {
  const current = section(body);
  if (!current && !required) return [];
  if (!current) throw new Error('Configure a mentor before accepting or settling the task.');
  const links = [];
  marked.walkTokens(current.tokens.slice(current.first + 1, current.last), token => {
    if (token.type === 'link' && token.text === 'Configuration command') links.push(token.href);
    if (token.type === 'html' && token.raw.trim().startsWith('<!-- mfcp-mentor-command:')) {
      const value = token.raw.trim();
      if (!value.endsWith('-->')) throw new Error('Invalid mentor command reference.');
      const url = JSON.parse(value.slice('<!-- mfcp-mentor-command:'.length, -3).trim());
      if (typeof url !== 'string') throw new Error('Invalid mentor command reference.');
      links.push(url);
    }
  });
  if (!links.length) throw new Error('The MFCP Mentor section needs a configuration command link for each mentor.');
  return [...new Set(links)];
}

export function assertMentorSection(body, configurations) {
  const variants = [configurations];
  if (configurations.length === 1) variants.push(configurations.map(record => ({...record, mentor: {...record.mentor, signoffs: undefined}})));
  for (const records of variants) {
    const expected = updateMentorSection(body, records);
    const legacy = records.reduce((value, {commandUrl}) => value.replace(reference(commandUrl), `[Configuration command](${commandUrl})`), expected);
    if (expected === body || legacy === body) return;
  }
  throw new Error('The MFCP Mentor section differs from the authorized command. Configure the mentor again.');
}
