---
# SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
# SPDX-License-Identifier: MIT
name: mfcp-reply-issue
description: 在 missionhub-oss/mfcp 的任务 Issue 下写 3 到 5 句自然语言回复，并发送 MFCP Bot 的导师、负责人、结算和晋级命令。用户要申领任务、更新进展、提交成果、做导师评估、组织者复核或操作 @mfcp-progress 时使用。
---

# MFCP Issue 回复

用于在 `missionhub-oss/mfcp` 的任务 Issue 下回复参与申请、进展、成果提交、导师评估和组织者复核，以及发送 Bot 命令。目标是让人快速读懂，避免评审时被过量信息淹没。

## 写作要求

- 默认 3 到 5 句话，通常一段。像给同事发一条短消息，或发一条个人推文。
- 用第一人称自然语言。先说结果，再说证据链接，最后说阻碍或下一步。
- 不写标题、表格、项目符号和逐项清单。示例只作参考，不要逐字套用，也不要保留字段名。
- 不复述 Issue 背景，不解释验收条件，不写客套话和总结。
- 详细日志、命令、长输出放到链接里。需要保留的代码、命令和链接照原样写。
- 中文为主；项目名、命令、代码和链接保留原文。
- 不添加 AI 生成说明、署名或 `Generated with` 字样。

## 内容

- 参与申请：相关经验、可参与时间、对任务的理解、需要的帮助。
- 进展：完成内容、验证结果、阻碍、下一步。
- 成果提交：交付内容、验收结果、上游 PR 链接、范围边界。
- 导师评估或组织者复核：结论、证据、剩余事项、下一步。

## 示例

参与申请：

> 我做嵌入式仿真一年多，熟悉 Rockchip 板级资料，每周能投入 10 小时。想先补文档的映射表，再跑 qtest。需要确认 TRM 版本和 rock-5b-plus 的范围。

进展：

> GPIO0–GPIO4 已接到 SoC，qtest 59 项全过。中断回归还差 EOI 用例，卡在 ...。PR: ... 需要导师确认 ...

成果提交：

> 任务完成：GPIO0–GPIO4 接入 SoC，qtest 59 项通过，PR #53 已合入。文档和边界说明已更新，范围未包含 pinmux。

## Bot 命令

配置导师、分配负责人、结算和晋级使用单独的评论。命令第一行写 `@mfcp-progress ...`，不要和回复正文混在一条评论里。

- 配置导师：`@mfcp-progress configure mentor @用户名`
- 分配负责人：`@mfcp-progress configure assignee @用户名`
- 结算任务：`@mfcp-progress settle <已合入的上游 PR 链接>`
- 导师能力评估、面试、L3/L4 推荐和晋级审核：按 [Bot 命令示例](../../../docs/bot-command-examples.md) 的对应章节发送。

权限按命令区分：`configure assignee` 要求作者属于 Mentors Team；`configure mentor` 和 `settle` 由年度维护者发送，任务负责人不能结算自己的任务；晋级相关命令按对应章节确认资格。发送前读 [Bot 命令示例](../../../docs/bot-command-examples.md) 和年度规则，核对作者身份、上游链接和年度。

Bot 用表情表示处理状态，成功后添加 👍。失败时按 Bot 的回复修正 Issue 状态或命令，再重新发送。

## 发布前检查

- 确认当前 GitHub 身份已注册，并且有发送该命令的权限。
- 公开评论不包含凭据、私人联系方式或薪酬信息。
- 回复和命令分开发送；命令只写需要的参数，不附加解释。
- 导师评估和组织者复核写入实际结论、证据链接和剩余事项，不复制模板字段。

## 参考资料

- [任务评论示例](../../../docs/task-comments.md)
- [Bot 命令示例](../../../docs/bot-command-examples.md)
- [贡献指南](../../../CONTRIBUTING.md)
