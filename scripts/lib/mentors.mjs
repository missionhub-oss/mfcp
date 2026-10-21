// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import { createClient } from './github.mjs';

export const MENTOR_ORGANIZATION_ID = 345787850;
export const MENTOR_TEAM_ID = 20231868;

export async function isMentor(user) {
  if (user.type !== 'User' || !Number.isSafeInteger(user.id) || user.id <= 0 ||
      !/^[a-z0-9-]{1,39}$/i.test(user.login)) return false;
  const client = createClient(process.env.MFCP_MEMBERS_TOKEN || process.env.GITHUB_TOKEN, process.env.GITHUB_REPOSITORY);
  const root = `organizations/${MENTOR_ORGANIZATION_ID}/team/${MENTOR_TEAM_ID}`;
  const team = await client.request(root);
  if (team.id !== MENTOR_TEAM_ID || team.organization.id !== MENTOR_ORGANIZATION_ID) throw new Error('Unexpected Mentor Team identity.');
  const identity = await client.request(`users/${encodeURIComponent(user.login)}`);
  if (identity.id !== user.id) throw new Error('Mentor account identity changed.');
  let membership;
  try {membership = await client.request(`${root}/memberships/${encodeURIComponent(user.login)}`);}
  catch (error) {if (error.status === 404) return false; throw error;}
  return membership.state === 'active';
}

export async function requireMentor(user) {
  if (!await isMentor(user)) throw new Error('Only active members of processmission-intern/mentors may execute bot commands.');
}
