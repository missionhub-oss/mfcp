// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import {execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {z} from 'zod';
import {communitySnapshotSchema} from './lib/community.mjs';

const {values} = parseArgs({options: {'chat-id': {type: 'string'}}});
const chatId = z.string().regex(/^oc_[a-f0-9]+$/).parse(values['chat-id']);
const response = JSON.parse(execFileSync('lark-cli', ['im', 'chats', 'get', '--params', JSON.stringify({chat_id: chatId}), '--as', 'user', '--format', 'json'], {
  encoding: 'utf8', timeout: 60_000,
  env: {...process.env, LARKSUITE_CLI_NO_UPDATE_NOTIFIER: '1', LARKSUITE_CLI_NO_SKILLS_NOTIFIER: '1'},
}));
const chat = z.object({ok: z.literal(true), data: z.object({
  chat_status: z.literal('normal'), chat_mode: z.literal('group'),
  user_count: z.string().regex(/^(0|[1-9][0-9]*)$/),
})}).parse(response).data;
const snapshot = communitySnapshotSchema.parse({members: Number(chat.user_count), observed_at: new Date().toISOString()});
await writeFile(new URL('../site/community.json', import.meta.url), `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Read ${snapshot.members} community members from Feishu at ${snapshot.observed_at}.`);
