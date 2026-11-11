# Humanize

Humanize（`hmz`）通过协作流程组织编程 Agent 完成实现、审查和迭代，提供命令行与桌面工具。
本方向可提出 Agent 接入、流程执行、交互界面、缺陷修复、测试和文档相关任务。

## 入门学习

首次接触 Humanize，可以从 [Humanize Agent 工作流实践课程](learning-courses.md)开始。课程从工作流体验、Flame-Chase 到第一个 flow，配合官方文档完成安装、第一次运行和 flow 编写。

## 官方文档

- [文档首页](https://docs.humanfia.ai/humanize/)：功能概览、安装和用户指南入口。
- [安装](https://docs.humanfia.ai/humanize/user/installation)：Desktop、CLI、`uv` 和 Agent CLI。
- [第一次运行](https://docs.humanfia.ai/humanize/user/first-run)：在临时仓库运行第一个 flow。
- [第一个 flow](https://docs.humanfia.ai/humanize/weaver/writing-a-flow)：`@flow`、角色、环境、参数和测试。
- [Flow API](https://docs.humanfia.ai/humanize/reference/flows)：`hmz.flows` 接口和命令参数。
- [Flow 目录](https://humanfia.ai/flows/)：官方内置 flow。

## 上游入口

- [Humanize 项目介绍](https://humanfia.ai/projects/humanize)
- [Humanize 源码](https://github.com/humanfia/humanize)
- [上游贡献指南](https://github.com/humanfia/humanize/blob/main/CONTRIBUTING.md)

## 实践与验收

任务开始前记录 Humanize 版本、操作系统、使用的 Agent 及运行环境，并与导师确认范围、复现步骤和验收证据。
涉及功能、接口或运行方式调整时，先按上游贡献指南与维护者讨论；提交时说明实际修改、执行过的检查和结果。
上游 PR 的标题与提交说明使用其规定的 Conventional Commits 格式。

参与 MFCP 计分的任务使用原生 Type `Task`、`project/humanize`、年度和难度标签，
由已注册参与者担任 Assignee，并配置独立导师。作者按
[本计划提交规范](../../CONTRIBUTING.md#提交格式与-dco)使用真实姓名签署 DCO；
英文姓名使用全称，中文姓名使用完整拼音，通常将姓名各部分的首字母大写，也可以将姓氏全部大写。
导师 DCO 为结算的可选签署，导师参与通过任务配置与评审记录核实。

[2026.v3](../../programs/2026/rules/v3.json) 将 `humanfia/humanize` 列为可结算的上游仓库。
参与者完成复现和验证验收，上游 PR 合入默认分支后，按[Bot 操作说明](../../docs/bot-command-examples.md)
提交结算证据并以 Completed 关闭任务。Bot 核对 PR 作者、提交归属、作者 DCO、导师配置授权，
以及任务记录中的规则版本。首次结算时保存的规则版本用于该任务的后续操作。

任务发布方式见[贡献指南](../../CONTRIBUTING.md)，年度安排见[2026 年培养安排](../../programs/2026/README.md)。
