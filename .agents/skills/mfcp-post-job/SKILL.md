---
# SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
# SPDX-License-Identifier: MIT
name: mfcp-post-job
description: 按 missionhub-oss/mfcp 招聘规范将岗位信息整理为 jobs/ 目录下的独立 Markdown 文件（支持可选英文版），完成校验、构建测试与本地预览，并严格遵循仓库提交格式、DCO 与 PR 标题规范发起 Pull Request。用户要求发布、更新或关闭 MFCP 官网招聘岗位并提交 PR 时使用。
---

# MFCP 招聘岗位发布与 PR 提交

将招聘需求整理为 `missionhub-oss/mfcp` 仓库 `jobs/` 目录下的独立 Markdown 岗位文件，覆盖信息核对、Markdown 编写、校验测试、本地预览，以及符合仓库 `CONTRIBUTING.md` 和 `Progression integrity` 检查的 Commit 与 Pull Request 流程。技能随仓库保存在 `.agents/skills/mfcp-post-job/`，不安装全局副本。

## 信息收集与核对

动手编写前，先从用户提供的资料中提取已知信息，并集中确认缺失的必填项；不编造薪资、工作地点、投递邮箱、投递链接或任职要求：

| 类别 | 字段 | 确认内容 |
| --- | --- | --- |
| 必填 | `title`、`company`、`summary` | 岗位名称、招聘单位/团队、列表卡片用一句话简介 |
| 必填 | `location`、`employment_type` | 工作地点；岗位类型（`full-time`、`intern`、`part-time`、`contract`） |
| 必填 | `published_at` | 发布日期，默认使用北京时间当天 `YYYY-MM-DD` |
| 必填 | 正文内容 | 岗位职责、任职要求、投递说明等真实内容 |
| 推荐 | `work_mode`、`salary`、`experience` | 办公方式（`onsite`、`hybrid`、`remote`）、薪资范围、经验要求 |
| 推荐 | `apply_url`、`apply_email`、`tags` | 投递链接（`http`/`https`）、投递邮箱、技术关键词列表 |
| 可选 | `status`、`featured`、`updated_at` | 状态（默认 `open`，关闭填 `closed`）、是否置顶、更新日期 |
| 可选 | 英文翻译 | 是否同步创建 `jobs/<slug>.en.md` 供英文页面无缝切换 |

隐私与合规核对：

- 公开页面不写入未授权的私人手机号、内部凭据或保密协议内容。
- 投递方式仅使用招聘方确认公开的邮箱、网申链接或社区入口。

## 目录结构与 Markdown 规范

仓库构建模块 `scripts/lib/jobs.mjs` 使用 `z.strictObject` 对文件命名、YAML Front Matter、图片路径和正文 HTML 执行严格校验，禁止添加未声明字段。仓库内示例见 `jobs/example-embedded-systems-engineer.md` 与 `jobs/example-embedded-systems-engineer.en.md`。

| 项目 | 规范 |
| --- | --- |
| 默认（中文）岗位文件 | `jobs/<slug>.md` |
| 可选英文翻译文件 | `jobs/<slug>.en.md`（必须与基础 `.md` 同名 `<slug>`） |
| 可选配图目录 | `jobs/assets/`（如 `jobs/assets/<slug>/banner.webp`，仅限本地相对路径 `assets/...`） |
| `<slug>` 命名 | 仅限小写字母、数字和连字符（`^[a-z0-9]+(?:-[a-z0-9]+)*$`），建议包含单位或方向关键词 |

Front Matter 模板：

```yaml
---
title: "岗位名称"
company: "招聘单位"
summary: "一句话概括岗位核心方向与职责。"
location: "北京 / 远程"
employment_type: full-time
work_mode: hybrid
salary: "25K-40K"
experience: "1-3 年"
status: open
published_at: "2026-11-26"
tags:
  - Linux
  - RISC-V
apply_url: https://example.com/apply
apply_email: jobs@example.com
featured: false
---
```

字段与正文细则：

- `published_at` 与 `updated_at` 必须使用引号包裹的 `YYYY-MM-DD` 字符串，避免 YAML 解析为 Date 对象。
- `employment_type` 仅允许 `full-time`、`intern`、`part-time`、`contract`；`work_mode` 仅允许 `onsite`、`hybrid`、`remote`；`status` 仅允许 `open`、`closed`。
- `apply_url` 仅允许 `http://` 或 `https://`；`apply_email` 必须为合法邮箱格式。
- 列表页排序规则为：`open` 优先于 `closed`、`featured: true` 优先、`published_at` 降序、同日按 `slug` 升序。
- 正文禁止使用一级标题（`#`），主标题由 Front Matter 的 `title` 渲染；正文从二级标题（`##`）开始，构建器会自动提取全部 `##` 生成左侧固定目录。
- 章节标题保持简洁，不使用破折号（`——`、`—`）；正文如需图片，使用相对路径 `![图片说明](assets/<slug>/image.webp)`，禁止外链及带 `?` 或 `#` 的路径。
- 禁止使用可执行 JS Front Matter（`---js`）及原始 `<script>`/`<iframe>` 等不安全标签。
- 关闭历史岗位时，保留原文件并将 `status` 改为 `closed`、补充 `updated_at`，避免原有 `jobs/<slug>/` 链接失效。

若同步编写英文版 `jobs/<slug>.en.md`：

- 与中文版共享相同 `<slug>`、日期、枚举值与投递信息，并将 `title`、`company`、`summary`、`location`、`salary`、`experience`、`tags` 及正文译为地道英文。
- 保持 `##` 章节结构对应，确保网页切换英文模式时标题、元信息、左侧目录与正文完整切换。

## 本地校验、测试与预览

完成文件编辑后，运行仓库完整校验、测试和页面构建（传入 GitHub 令牌避免 Issues API 限流）：

```sh
npm run check
GITHUB_TOKEN=$(gh auth token) npm test
GITHUB_TOKEN=$(gh auth token) npm run build:pages
```

核对构建产物：

- `site-dist/jobs/index.html` 包含新增或更新的岗位卡片，顺序、状态徽章与标签无误。
- `site-dist/jobs/<slug>/index.html` 标题、元信息网格、目录锚点、投递按钮与中英文切换均正常渲染。
- 若需人工目视核对，可启动本地静态服务：`python3 -m http.server 4173 --bind 127.0.0.1 --directory site-dist`，访问 `http://127.0.0.1:4173/jobs/`。

## 按仓库规范提交 Commit 与发起 PR

提交前严格核对 `CONTRIBUTING.md` 与 `scripts/lib/commit-policy.mjs` 的全部约束（`Progression integrity` 检查不通过会直接阻止合入）：

1. **隔离分支与基线**：
   - 先执行 `git fetch upstream`（或同步默认主分支），基于最新 `upstream/main` 创建干净分支，命名建议 `jobs/<slug>`（禁止使用任何智能体名称作为分支前缀）。
   - 仅纳入本次岗位相关文件（`jobs/<slug>.md`、可选 `jobs/<slug>.en.md` 及 `jobs/assets/...`），不混入无关改动或构建产物。

2. **核对作者身份与 DCO**：
   - 检查 `git var GIT_AUTHOR_IDENT`，确认作者姓名是本人真实姓名的英文全称或完整拼音（如 `Chao Liu` 或 `Chao LIU`，禁止 GitHub 用户名或昵称），且邮箱有效。
   - 使用 `git commit -s` 自动附加与作者姓名、邮箱完全一致的 `Signed-off-by:` 尾行；禁止添加 `Co-Authored-By` 或任何 AI 生成标识。

3. **Commit 消息格式**：
   - 第 1 行标题必须满足 `module: subject`（正则 `^[a-z][a-z0-9/-]*: \S`），推荐格式：
     - 新增：`jobs: add <concise role name>`
     - 更新：`jobs: update <concise role name>`
     - 关闭：`jobs: close <concise role name>`
   - 第 2 行必须为空行。
   - 第 3 行起填写简洁的英文或中文说明正文，交代变更的岗位、单位及关键信息；正文与 `Signed-off-by:` 之间空一行。
   - **全文每一行（含标题、正文与签名行）不超过 72 个 Unicode 字符**，统一 LF 换行，禁止 `\r`、制表符 `\t` 与行尾空白。
   - 提交后立即使用仓库策略模块做本地校验：

```sh
node --input-type=module -e '
import {execFileSync} from "node:child_process";
import {validateCommitMessage} from "./scripts/lib/commit-policy.mjs";
const msg = execFileSync("git", ["log", "-1", "--format=%B"], {encoding: "utf8"});
const email = execFileSync("git", ["log", "-1", "--format=%ae"], {encoding: "utf8"}).trim();
validateCommitMessage(msg, email);
console.log("Commit policy passed.");
'
```

4. **推送分支与创建 Pull Request**：
   - 仅在用户明确要求提交 PR 时推送分支并创建 PR；推送到个人 Fork（通常为 `origin`），以 `missionhub-oss/mfcp` 的 `main` 为目标分支。
   - **PR 标题同样受 `validateSubject` 强制校验**：必须使用 `module: subject`（例如 `jobs: add embedded linux driver engineer`），单行、不超过 72 个 Unicode 字符、无制表符与行尾空白。提交前执行校验：

```sh
node --input-type=module -e '
import {validateSubject} from "./scripts/lib/commit-policy.mjs";
validateSubject(process.argv[1]);
console.log("PR title policy passed.");
' "jobs: add <concise role name>"
```

   - **PR 正文**简明列出：岗位名称与招聘单位、操作类型（新增/更新/关闭）、变更文件路径、以及本地验证结果（`npm run check`、`npm test`、`npm run build:pages`）；禁止包含 AI 署名或 `Generated with` 字样。
   - 使用 GitHub CLI 或仓库 PR 工具创建 PR（例如 `gh pr create --repo missionhub-oss/mfcp --base main --head <fork-owner>:jobs/<slug> --title "..." --body "..."`），创建后返回 PR 链接并核对 `Repository checks` 与 `Progression integrity` 检查状态。
