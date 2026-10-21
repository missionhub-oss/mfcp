// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { normalizeProfile, totals, rulesSchema } from './lib/profile.mjs';
import { DEFAULT_REPOSITORY } from './lib/github.mjs';

if (process.argv[2]) process.chdir(process.argv[2]);

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const root = `https://github.com/${DEFAULT_REPOSITORY}`;
const versions = [];
for (const year of (await readdir('programs')).filter(name => /^\d{4}$/.test(name))) {
  let files;
  try {files = await readdir(`programs/${year}/rules`);} catch (error) {if (error.code === 'ENOENT') continue; throw error;}
  for (const file of files) versions.push(rulesSchema.parse(JSON.parse(await readFile(`programs/${year}/rules/${file}`, 'utf8'))));
}
const rules = versions.filter(rule => Date.parse(rule.effective_at) <= Date.now()).sort((a, b) => Date.parse(b.effective_at) - Date.parse(a.effective_at))[0];
if (!rules) throw new Error('No effective progression rules.');
const profiles = [];
for (const file of await readdir('participants')) {
  if (file.endsWith('.json')) profiles.push(normalizeProfile(JSON.parse(await readFile(`participants/${file}`, 'utf8')), `participants/${file}`));
}
profiles.sort((a, b) => b.level - a.level || b.experience - a.experience || a.github_login.localeCompare(b.github_login));
const source = event => {
  const value = event.proof.source;
  return value.kind === 'registration' ? `${root}/pull/${value.pr}` : `${root}/issues/${value.issue}${value.kind === 'comment' ? `#issuecomment-${value.comment}` : ''}`;
};
const cards = profiles.map(profile => {
  const stats = totals(profile);
  const target = profile.level < 2 ? rules.level2 : rules.level3;
  return `<article data-login="${escape(profile.github_login.toLowerCase())}"><header><h2><a href="https://github.com/${escape(profile.github_login)}">@${escape(profile.github_login)}</a></h2><strong>L${profile.level}</strong></header>
<p>${profile.experience} XP · ${stats.tasks} <span data-en="accepted tasks" data-zh="验收任务">accepted tasks</span> · ${stats.pull_requests} <span data-en="merged upstream PRs" data-zh="上游合入 PR">merged upstream PRs</span></p>
<label>${profile.experience} / ${target.experience} XP<progress max="${target.experience}" value="${Math.min(profile.experience, target.experience)}"></progress></label>
<p class="muted" data-en="${profile.level === 0 ? 'L1 requires a merged registration PR.' : profile.level >= 2 ? 'Further promotion requires human review.' : 'L2 also requires 6 tasks, 6 upstream PRs and 2 L2+ tasks.'}" data-zh="${profile.level === 0 ? '注册 PR 合入后满足 L1 晋级条件。' : profile.level >= 2 ? '后续晋级需要人工审核。' : 'L2 同时要求 6 个任务、6 个上游 PR 和 2 个 L2 以上任务。'}">${profile.level === 0 ? 'L1 requires a merged registration PR.' : profile.level >= 2 ? 'Further promotion requires human review.' : 'L2 also requires 6 tasks, 6 upstream PRs and 2 L2+ tasks.'}</p>
<details><summary data-en="Contribution and promotion history" data-zh="贡献与晋级记录">Contribution and promotion history</summary><ul>
${profile.promotions.map(event => `<li><a href="${source(event)}">L${event.from} → L${event.to}</a> · ${escape(event.policy.id)} · ${escape(event.proof.at)}<p>${escape(event.reason)}</p></li>`).join('')}
${profile.contributions.map(task => `<li><a href="${root}/issues/${task.issue}">#${task.issue}</a> · L${task.difficulty} · ${escape(task.policy.id)} · ${task.settlements.length} settlement(s)</li>`).join('')}
${profile.adjustments.map(event => `<li><a href="${source(event)}">−${event.points} XP</a> · ${escape(event.proof.at)}</li>`).join('')}
</ul><a href="${root}/blob/main/participants/${escape(profile.github_login.toLowerCase())}.json" data-en="View complete record" data-zh="查看完整记录">View complete record</a></details></article>`;
}).join('\n');
const sha = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MFCP Contributors</title><style>
:root{color-scheme:light dark;font-family:system-ui,sans-serif;background:#0b1220;color:#e6edf7}body{max-width:1100px;margin:auto;padding:36px 24px}a{color:#81c9ff}h1{font-size:clamp(2rem,5vw,3.5rem);margin-bottom:12px}nav,article header{display:flex;justify-content:space-between;align-items:center;gap:20px}button,input{font:inherit;padding:10px 14px;border:1px solid #45536c;border-radius:8px;background:#142136;color:inherit}input{width:min(420px,90%);margin:24px 0}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:20px}article{border:1px solid #324259;border-radius:16px;padding:24px;background:#142136}h2{font-size:1.2rem}strong{padding:6px 12px;background:#294c3d;border-radius:8px}progress{display:block;width:100%;height:14px;margin:12px 0;accent-color:#5cddb0}.muted,footer{color:#adbbce;font-size:.9rem;line-height:1.6}details{margin-top:22px}li{margin:12px 0}footer{margin:32px 0}[hidden]{display:none!important}</style></head><body>
<nav><a href="${root}">Mission Forge</a><button id="language" type="button">简体中文</button></nav>
<h1 data-en="Meet our contributors" data-zh="认识我们的开源贡献者">Meet our contributors</h1><p data-en="Learn. Practice. Contribute. Grow." data-zh="学习 · 实践 · 贡献 · 成长">Learn. Practice. Contribute. Grow.</p>
<a href="${root}/blob/main/programs/${rules.year}/progression.md">${rules.year} · ${escape(rules.id)}</a><br><input id="search" type="search" aria-label="Search GitHub username" placeholder="Search GitHub username">
<main>${cards}</main><footer><span data-en="Published contributor records · Source" data-zh="已生效的贡献者记录 · 来源提交">Published contributor records · Source</span> <a href="${root}/commit/${sha}">${sha.slice(0, 12)}</a></footer>
<script>document.getElementById('search').addEventListener('input',event=>{const query=event.target.value.toLowerCase();document.querySelectorAll('article').forEach(card=>{card.hidden=!card.dataset.login.includes(query)})});document.getElementById('language').addEventListener('click',()=>{const language=document.documentElement.lang==='en'?'zh':'en';document.documentElement.lang=language==='zh'?'zh-CN':'en';document.querySelectorAll('[data-en]').forEach(element=>{element.textContent=element.dataset[language]});document.getElementById('language').textContent=language==='zh'?'English':'简体中文'});</script></body></html>`;
await mkdir('site-dist', {recursive: true});
await writeFile('site-dist/index.html', html);
console.log(`Built contributor directory for ${profiles.length} participants at ${sha}.`);
