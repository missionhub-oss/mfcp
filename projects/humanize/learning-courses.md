<!-- SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission -->
<!-- SPDX-License-Identifier: MIT -->

# Humanize Agent 工作流实践课程

初次接触 Humanize 的贡献者可以从这份课程目录开始，先理解 Humanize 怎样组织 Agent 工作流，再学习 Flame-Chase 多 Agent 轮流流程和 `@flow` 的写法，最后结合任务阅读源码与官方文档。

## 课程介绍

- **课程**：[Humanize 教程](https://www.bilibili.com/video/BV18on96xELo/)
- **作者**：[绝对是泽文啦](https://space.bilibili.com/483048140)
- **语言**：中文。
- **目录核对日期**：2026 年 11 月 11 日。
- **当前内容**：3 个视频，总时长 **12 分 57 秒**。

课程从 Humanize 的定位和工作流体验开始，介绍两个 Agent 轮流的 Flame-Chase 流程，以及用 `@flow` 写第一个 flow 的完整过程。课程面向已经能读写 Python、用过 Git 和命令行的开发者；前两集建立工作流和多 Agent 协作的概念，第三集跟着官方文档写出并测试第一个 flow。

## 开始前的准备

- 能阅读 Python 程序，了解 `async`/`await`、函数和类。
- 能使用终端、Git 和 Python 3.12 或以上；安装 `uv` 和一个已登录的 coding agent CLI，例如 Claude Code 或 Codex。
- 准备一个可以给 Agent 修改的临时仓库。Agent 默认绕过审批，不要在重要仓库直接运行。
- 记录 Humanize 版本、Agent CLI 和模型、操作系统与运行命令。

## 官方文档

| 文档 | 内容 |
| --- | --- |
| [文档首页](https://docs.humanfia.ai/humanize/) | 功能概览、安装和用户指南入口。 |
| [安装](https://docs.humanfia.ai/humanize/user/installation) | Desktop、CLI、`uv` 和 Agent CLI 的安装方式。 |
| [第一次运行](https://docs.humanfia.ai/humanize/user/first-run) | 在临时仓库运行第一个 flow。 |
| [第一个 flow](https://docs.humanfia.ai/humanize/weaver/writing-a-flow) | `twice`、`@flow`、角色、环境、参数、`hmz exec` 和 fake agent 测试。 |
| [Loops](https://docs.humanfia.ai/humanize/weaver/loops) | 循环、Ralph/stateful 和运行恢复。 |
| [Flow API](https://docs.humanfia.ai/humanize/reference/flows) | `hmz.flows` 接口、`-a`/`-e`/`-p` 参数和测试方法。 |
| [Agent 后端](https://docs.humanfia.ai/humanize/features/backends)、[运行观察](https://docs.humanfia.ai/humanize/user/steering)、[预算](https://docs.humanfia.ai/humanize/features/allowances)、[Trace](https://docs.humanfia.ai/humanize/user/tracing) | Agent 接入、实时干预、运行预算和运行记录。 |
| [Flow 目录](https://humanfia.ai/flows/) | 官方内置 flow 列表。 |
| [源码](https://github.com/humanfia/humanize) 与 [贡献指南](https://github.com/humanfia/humanize/blob/main/CONTRIBUTING.md) | 实现、示例、测试和上游提交流程。 |

## 建议学习顺序

| 阶段 | 视频 | 学习目标 | 配套文档 |
| --- | --- | --- | --- |
| 认识 Humanize | 第 1 集 | 理解 Humanize 的定位、Agent 后端、flow、运行观察和预算。 | 文档首页、Agent 后端、运行观察 |
| 理解多 Agent 协作 | 第 2 集 | 理解 Flame-Chase 为什么让两个 Agent 轮流、每轮新会话、只交接工作区文件。 | Loops、Flame-Chase 源码 |
| 写出第一个 flow | 第 3 集 | 用 `@flow` 声明角色、环境和参数，运行 `twice`，用 fake agent 测试。 | 第一个 flow、Flow API |

## 全部课程

| 编号 | 课程 | 时长 | 内容 |
| --- | --- | --- | --- |
| 1 | [Humanize 将重新定义 AI Agent 的工作流体验](https://www.bilibili.com/video/BV18on96xELo/) | 5:35 | 从 Humanize 的定位开始，介绍把已有的 coding agent 接入统一工作流。配合官方文档可以继续了解 flow、运行观察、预算和 trace。 |
| 2 | [两个 AI 轮流写代码，为什么比一个更靠谱？humanize2 的 Flame-Chase 流程](https://www.bilibili.com/video/BV1RbW86MEH5/) | 2:41 | 两个 Agent 在同一任务上轮流动手，每轮开启新会话，只通过工作区文件交接；核心循环只有四条语句。 |
| 3 | [5 分钟写出第一个 flow：Humanize 的 @flow 从定义到测试](https://www.bilibili.com/video/BV1VsWj6eErT/) | 4:41 | 跟着官方文档写 `twice`：`@flow` 声明角色、环境和参数，`hmz exec` 运行，`git diff` 检查改动，假 Agent 零成本测试。 |

第 2 集的 Flame-Chase 实现见 [`src/hmz/flows/builtin/flame_chase/__init__.py`](https://github.com/humanfia/humanize/blob/main/src/hmz/flows/builtin/flame_chase/__init__.py)。第 3 集的完整步骤见 [Your first flow](https://docs.humanfia.ai/humanize/weaver/writing-a-flow)。

## 学习记录与参与任务

每完成一集，记录使用的 Humanize 版本、Agent CLI 和模型、操作步骤、实际输出，以及仍未理解的问题。尝试用自己的语言说明 flow 的角色、环境、参数、会话和循环，并能从运行记录中找到关键回合。

开始参与前，按[参与者注册说明](../../participants/README.md)完成注册。随后按[贡献指南中的申领流程](../../CONTRIBUTING.md#申领任务)选择任务，在原 Issue 中说明准备情况、学习记录和需要的指导。课程笔记可以帮助沟通，任务成果按对应验收条件提交。

## 来源与更新

课程标题、时长和单集简介来自 [B 站课程合集](https://www.bilibili.com/video/BV18on96xELo/)及其[公开接口](https://api.bilibili.com/x/web-interface/view?bvid=BV18on96xELo)；文档链接以 [Humanize 官方文档](https://docs.humanfia.ai/humanize/)为准。更新本页时核对视频 BV 号、时长和文档路径，并更新核对日期。视频内容的授权以原页面为准。
