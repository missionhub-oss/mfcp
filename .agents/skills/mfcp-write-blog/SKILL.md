---
# SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
# SPDX-License-Identifier: MIT
name: mfcp-write-blog
description: 将 MFCP 开源实践分享的会议口播稿与原始幻灯片（PDF/PPTX）整理为符合 missionhub-oss/mfcp 规范的中英双语技术博客，完成幻灯片逐页导出、图文编排、本地构建预览与回归测试。用户要求把分享转录稿写成 MFCP 博客或发布技术文章时使用。
---

# MFCP 博客写作

将 MFCP 开源实践分享的会议口播稿（逐字稿）与原始幻灯片转化为仓库 `blogs/` 下的中英双语技术博客，覆盖资料核对、幻灯片导出、双语撰写、本地预览、测试校验与合规提交。技能随仓库保存在 `.agents/skills/mfcp-write-blog/`，不安装全局副本。

## 输入与资料核对

动手写作前先收齐并核实真实资料：

1. **完整阅读口播稿**：通读整份会议转录文本，提取完整技术脉络、架构细节、实验指标、代码路径、命令示例与现场问答，逐条核对语音识别可能造成的专有名词误差。
2. **核对仓库已有活动元数据**：查阅 `site/events.md` 与 `slides/`，确认该场分享的准确日期、B 站回放地址（`video_url`）以及原始幻灯片文件路径（`slides_path`，支持 `.pdf` 或 `.pptx`）。若原始幻灯片或回放尚未入库，先向用户确认后再继续。
3. **核对外部引用**：涉及论文、开源仓库、榜单或工具名称时核对原始链接与准确拼写，不凭记忆编造编号、数据或结论。

## 目录结构与 Front Matter 规范

仓库构建脚本 `scripts/lib/blogs.mjs` 对文件名、图片路径与 YAML Front Matter 做严格校验（`z.strictObject`，禁止添加未声明字段）：

| 项目 | 规范 |
| --- | --- |
| 中文正文 | `blogs/<slug>.md` |
| 英文正文 | `blogs/<slug>.en.md`（与中文共用同一个 `<slug>`，供网页双语切换） |
| 幻灯片图片 | `blogs/assets/<slug>/slide-01.webp` 至 `slide-NN.webp` |
| `<slug>` 命名 | 仅限小写字母、数字与连字符（`^[a-z0-9]+(?:-[a-z0-9]+)*$`） |

Front Matter 示例：

```yaml
---
title: "简洁准确的文章主标题"
summary: "直接概括文章核心技术脉络与工程内容，不写来源说明。"
date: "2026-11-06"
published_at: "2026-11-06"
author: "分享者姓名"
tags: ["项目或主题", "技术方向", "MFCP"]
cover: "assets/<slug>/slide-01.webp"
cover_alt: "封面幻灯片替代文本"
video_url: "https://www.bilibili.com/video/BVxxxxxxxxxx/"
slides_path: "slides/<slides-filename>"
---
```

字段要求：

- `date` 填分享当天日期（`YYYY-MM-DD`），`published_at` 默认与 `date` 保持一致；博客列表页严格按 `published_at` 降序排列，最新文章排在最前。
- `summary` 直接说明技术主题与核心内容，不出现「本文整理自某场分享」等出处套话。
- 中文版 `author` 填中文姓名，英文版 `author` 填规范英文全称或拼音姓名。
- `slides_path` 匹配 `^slides/[a-zA-Z0-9._/-]+$`；`video_url` 与 `slides_path` 在无对应资源时可省略。
- 正文禁止再写一级标题（`#`），主标题统一由 Front Matter 的 `title` 渲染。

## 幻灯片逐页导出与图文编排

每场分享的幻灯片全部逐页导出为 1080p WebP 并按讲解顺序编入正文：

1. **格式转换**：
   - PDF 幻灯片直接用 `pdftoppm -png -r 144` 渲染为约 1920×1080 PNG，再用 `cwebp -q 88` 转为 WebP。
   - PPTX 幻灯片先在 macOS 通过 Keynote（AppleScript 导出 PDF）或 LibreOffice（`soffice --headless --convert-to pdf`）无损转为 PDF，确认中文字体与版面无错位后，再按同样流程转为 1080p WebP。
   - 导出过程产生的 PDF、PNG、截图等中间文件存放于仓库内专用临时目录，并提前将该目录加入 `.git/info/exclude`，避免误提交。
2. **逐页视觉核对**：导出完成后检查全部 `slide-01.webp` 至 `slide-NN.webp`，确保无空白页、缺字、重叠或裁切。同时确认封面页 `slide-01.webp` 在博客列表页全宽窗格以 `object-fit: cover` 铺满时主体文字完整可见。
3. **正文插图方式**：
   - 所有图片必须位于 `blogs/assets/<slug>/` 下，使用相对路径 `![该页幻灯片内容描述](assets/<slug>/slide-NN.webp)`，禁止外链图片或带查询参数与锚点的图片路径。
   - 每张图片独占一段，按 `slide-01` 到末页单调递增顺序与对应讲解段落紧邻排布，覆盖全部页面。
   - 页面模板自动将图片渲染为纯净无边框大图并支持点击放大，正文禁止手工套用 `<figure>`、`<figcaption>` 或在图片下方另写图注。

## 口播稿转化与写作标准

1. **第一人称主讲者视角**：以分享嘉宾的第一人称（“我”）叙述，保留演讲者本人的思考路径、工程判断与真实案例细节，避免写成抽离现场感的第三人称新闻通稿。
2. **开篇来源引用块**：正文开头第一段用引用块交代出处：
   - 中文：`> 这篇博客文章整理自 YYYY 年 M 月 D 日 MFCP 开源实践分享《分享主题》。`
   - 英文：`> This post is adapted from my Month D, YYYY talk at the MFCP Open-Source Practice Sharing session, *English Talk Title*.`
3. **精简开场寒暄，直奔技术主体**：删去主持人开场串词、测试麦克风、暖场打趣和口语填充词，保留简洁的个人背景与全文结构导览后迅速进入核心技术内容。
4. **完整保留技术细节与现场问答**：
   - 完整呈现口播稿与幻灯片中的核心原理、实验数据、源码路径、性能分析步骤与优化结论；适合横向对比的数据整理为标准 Markdown 表格。
   - 保留分享后的「现场问答 / Live Q&A」章节，提炼提问背景与主讲者回答要点。
   - 文末附「相关资源 / Resources」章节，汇总回放、代码仓库、相关项目与论文链接。
5. **标题层级与左侧目录规范**：
   - 正文仅使用二级标题（`##`）与三级标题（`###`），左侧无边框目录自动提取全部 `##` 标题。
   - 各级标题保持简洁凝练、表意完整，**禁止使用破折号（`——`、`—`）**；既避免过长折行，也避免短到信息单薄（例如 `## Flow 科学：实验规律与发现`）。
6. **论文引用规范**：
   - 提及学术论文时，直接使用**论文英文原文标题**作为超链接文本指向论文页面（例如 `[Humanize: Judgement Engineering for Agentic Coding](https://arxiv.org/abs/2610.08900)`），不将 arXiv 编号拆出链接外，也不用中文自拟译名替代原文标题。
7. **主持人与人物称呼统一**：
   - 提及 MFCP 主持人时统一称呼为**「泽文」**（英文版统一写 **`Zevorn`**），不使用「刘超」或「刘超（泽文）」等并列称呼。
8. **语言与清洁度**：
   - 中文表达自然完整，项目名、代码标识符、命令、工具与模型名保留英文原名。
   - 禁止在正文、注释、提交信息或 PR 中写入 AI 生成声明、署名或 `Generated with` 字样。

## 英文版翻译标准

同步编写 `blogs/<slug>.en.md`，与中文版共享 Front Matter 结构、全部幻灯片顺序与完整技术细节：

- 遵循信达雅原则与地道英文技术写作习惯（English native expression），按英文语序重构长句，避免逐字直译。
- 英文 `title`、`summary`、`author`、章节标题（`##` / `###`）与正文完整对应，确保网页切换英文模式后标题、作者、日期、阅读时长、左侧目录与正文全部无缝切换。
- 英文标题同样简洁且不使用破折号，符号（如 `Q&A`）保持纯文本书写。

## 校验、本地预览与提交

1. **补充回归测试**：在 `tests/blogs.test.mjs` 中更新文章顺序与日期断言，并为新文章添加中英文全量幻灯片图片检查、双语目录非空检查及标题 ID 唯一性校验。
2. **执行构建与测试**（构建脚本需访问 GitHub Issues API，传入认证令牌避免限流）：

```sh
npm run check
GITHUB_TOKEN=$(gh auth token) npm test
GITHUB_TOKEN=$(gh auth token) npm run build:pages
```

3. **本地预览核对**：
   - 启动本地静态服务：`python3 -m http.server 4175 --bind 127.0.0.1 --directory site-dist`。
   - 核对 `/blogs/` 列表页（时间倒序、全宽条目左右交替排布、封面图铺满无黑边且无文字裁切）与 `/blogs/<slug>/` 详情页（正文居中、左侧无边框目录随滚动高亮、中英文切换完整、全部图片加载正常、移动端无横向溢出）。
   - 优先交付本地预览给用户审阅；收到明确指令后再提交 PR。
4. **提交规范与 DCO**：
   - 遵循 [贡献指南](../../../CONTRIBUTING.md)：使用 `blogs: ...` 或 `site: ...` 格式提交标题，所有行不超过 72 个 Unicode 字符，使用 LF 换行，附带作者本人真实英文全称或拼音的 `Signed-off-by`（`git commit -s`），不添加 `Co-Authored-By` 或任何 AI 署名。
   - 推送前可用 `scripts/lib/commit-policy.mjs` 的 `validateCommitMessage` 验证最新提交，确保 `Progression integrity` 检查一次通过。
