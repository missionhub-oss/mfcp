<!-- SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission -->
<!-- SPDX-License-Identifier: MIT -->

# Recruitment / 招聘岗位管理

本目录通过 Markdown 维护 MFCP 官网的[招聘](https://missionhub-oss.github.io/mfcp/jobs/)栏目，每个岗位对应一个独立的 Markdown 文件。

Each job posting on the MFCP website lives as an independent Markdown file in this directory.

## File Naming / 文件命名

- 中文或默认岗位文件：`jobs/<slug>.md`
- 可选英文翻译文件：`jobs/<slug>.en.md`（存在时，在英文界面下同一 `jobs/<slug>/` 链接自动展示英文内容）
- `<slug>` 仅使用小写字母、数字和连字符（例如 `embedded-linux-driver-engineer.md`），对应网站独立路径 `jobs/<slug>/`
- 如岗位正文包含图片，请放在 `jobs/assets/` 下并通过相对路径引用（例如 `assets/team.webp`）

## Front Matter Fields / 元数据字段

| Field | Required | Meaning |
| --- | --- | --- |
| `title` | Yes | 岗位名称 |
| `company` | Yes | 招聘单位或社区团队 |
| `summary` | Yes | 岗位一句话简介，用于列表卡片与页面摘要 |
| `location` | Yes | 工作地点（如 `北京 / 远程`、`上海`、`远程`） |
| `employment_type` | Yes | 岗位类型：`full-time`、`intern`、`part-time` 或 `contract` |
| `published_at` | Yes | 发布日期，引号包裹的 `YYYY-MM-DD` |
| `status` | No | 招聘状态：`open`（默认，招聘中）或 `closed`（已结束） |
| `work_mode` | No | 办公方式：`onsite`（现场）、`hybrid`（混合）或 `remote`（远程） |
| `salary` | No | 薪资范围（如 `25K-40K`、`面议`） |
| `experience` | No | 经验要求（如 `1-3 年`、`应届 / 在校生`） |
| `updated_at` | No | 最近更新日期，引号包裹的 `YYYY-MM-DD` |
| `tags` | No | 技术方向或关键词列表（YAML 数组） |
| `apply_url` | No | 投递链接（`http://` 或 `https://`） |
| `apply_email` | No | 投递邮箱 |
| `featured` | No | 是否置顶推荐（`true` / `false`，默认 `false`） |

正文不要使用一级标题（`#`），从二级标题（`##`）开始编写，构建器会自动为二级标题生成侧边目录。

## Example / 示例模板

```markdown
---
title: 嵌入式 Linux 驱动工程师
company: Process Mission
summary: 参与 RISC-V 与 ARM 平台 Linux 内核驱动开发、上游提交与板级验证。
location: 北京 / 远程
employment_type: full-time
work_mode: hybrid
salary: 25K-40K
experience: 1-3 年
status: open
published_at: "2026-11-26"
tags:
  - Linux
  - RISC-V
  - Device Driver
apply_email: jobs@example.com
---

## 岗位职责

- 负责嵌入式平台外设驱动的开发、调试与主线合入。

## 任职要求

- 熟悉 C 语言与 Linux 内核开发流程，有开源社区提交经验优先。

## 投递方式

请将简历与 GitHub 主页发送至上方投递邮箱，邮件标题注明岗位名称与姓名。
```
