<!-- SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission -->
<!-- SPDX-License-Identifier: MIT -->

# Bot 命令完整示例

在原任务 Issue 中发表普通评论，第一行写 `@mfcp-progress` 和命令。
复制示例时取代码块内部的内容。每次操作发表新评论，编辑旧评论不会执行。
将尖括号中的内容替换为真实 HTTPS 链接，并去掉尖括号；评估说明也需要
替换成实际结论。以下模板说明格式，实际验收和通过评估后再发表。

命令作者必须是 [Mentors Team](https://github.com/orgs/processmission-intern/teams/mentors)
的有效成员，并满足各项操作的职责要求。
权限和运行方式见 [Bot 操作说明](progression-bot.md)。

## 查看命令结果

Bot 在原命令评论上标记处理状态：

- **👀 处理中**：命令正在执行，或等待任务按 Completed 关闭、CI 检查或晋级 PR 审核。等待条件会通过评论说明。
- **👍 成功**：操作完成后移除 👀，添加 👍。
- **失败**：移除处理表情，在同一 Issue 回复，@命令作者并附上原评论链接、失败原因和命令指南。

参数错误和不支持的命令也会收到回复。通过评估的命令评论经身份和职责
核验后，Bot 确认其可用作晋级证据；实际晋级仍需通过相应审核。
成功时通过表情确认；已有的失败或等待回复会更新为成功结果。
同一命令只保留一条结果回复，等待状态会随实际处理结果更新。
Bot 只调整自己的表情，保留其他用户添加的表情。
已经确认成功的回复保留当时的结果；后续人工调整记录在 GitHub 时间线或
贡献者历史中。回复失败会在定时处理时重试，不重复发放经验值。

## 使用 GitHub 分配任务

以 `hongquan-prog` 负责、`zevorn` 指导的任务为例，在 Issue 右侧完成：

| GitHub 字段 | 设置 | 用途 |
| --- | --- | --- |
| Assignees | `hongquan-prog`，仅一人 | 指定任务负责人 |
| Labels | `kind/task` | 标记实践任务 |
| Labels | `difficulty/level1`，仅一个难度标签 | 指定任务难度为 L1 |
| Labels | `2026`，仅一个年度标签 | 选择已发布的 2026 年任务规则 |

设置 Assignee 就完成了任务分配。Bot 读取这些字段确定负责人、难度和年度。
新的实践任务表单默认带有 `2026`；已有任务需要维护者补充年度标签。
当前仅有 `2026` 年度标签，未来年度先发布对应规则，再增加如 `2027` 的标签。
一项自动计分任务对应一个负责人，多人独立交付使用关联任务分别记录。

## Mentor 代为分配任务：configure assignee

Mentor 没有仓库 Assignee 设置权限时，可以在该 Issue 发表：

```text
@mfcp-progress configure assignee @hongquan-prog
```

Bot 直接调用 GitHub 设置 Assignee，GitHub 时间线会记录这次分配。
这条命令只要求作者属于 Mentors Team，无需额外的年度维护者身份。
目标成员需要已经注册，并且是该 Issue 的作者，或已经在该 Issue 发表过
评论。仅在评论中被其他人 @提及不满足参与讨论的条件。

任务必须处于开放状态并带有 `kind/task` 标签。Bot 不覆盖已有的其他
负责人，也不转移已经保存的任务贡献。后续人工分配或取消分配会使此前
的旧命令失效，定时处理不会反复恢复旧的 Assignee。
负责人分配和 Mentor 配置可以按任意顺序完成。

## 指定 Mentor：configure

由年度维护者发表。目前年度维护者名单包含 `zevorn`。

```text
@mfcp-progress configure mentor @zevorn
```

也支持真实 GitHub 数字 ID，以下写法选择同一账号；选择一种写法即可：

```text
@mfcp-progress configure mentor 62325246
```

Mentor 必须已注册并属于 Mentors Team。配置时只要求 Issue 带有
`kind/task` 标签，可以在尚未分配负责人、设置难度和年度时执行。
Bot 更新 Issue 正文现有的 `### Mentor / 导师` 区域，显示 Mentor
账号和配置命令链接，保留职责说明及其他正文，替换 `TBD` 占位内容。
验证并更新成功后，Bot 给命令添加 👍。原命令作为权限证据保留。
首次验收前，可以发表新的 Mentor 命令更新该区域。
需要修改时发表新命令，保留原评论。

验收和结算时，Bot 检查唯一且已注册的 Assignee、独立的 Mentor、
难度和年度标签。首次复现验收将双方数字 ID、Mentor 命令证据、难度和
年度规则版本保存到负责人的 JSON。验收后不能通过新配置更换 Mentor。
后续验收与结算要求 Assignee、难度和年度与记录一致；
误改时先恢复原设置，新的独立交付范围使用新任务。标签修改不会改变历史积分。

## 验收复现：accept reproduction

由该任务指定的 Mentor 检查实际复现过程后发表：

```text
@mfcp-progress accept reproduction <复现记录的评论链接>
```

多个证据使用空格分隔：

```text
@mfcp-progress accept reproduction <复现记录链接> <运行日志链接>
```

记录应包含实际环境、步骤、观察到的行为和预期行为。此操作记录阶段验收，
经验值在最终结算时发放。

## 验收修改与验证：accept validation

先完成复现验收。指定 Mentor 检查补丁和验证结果后发表：

```text
@mfcp-progress accept validation <验证记录的评论链接> <上游PR链接>
```

验证记录包含实际执行步骤、结果和适用的回归验证。链接可以指向 Issue
评论、上游 PR 或公开日志。Bot 记录验收者和证据，结算时重新核对。

## 结算经验：settle

上游 PR 合入后，由年度维护者发表：

```text
@mfcp-progress settle <已合入的上游PR链接>
```

一项独立任务包含多个上游 PR 时，在同一条命令中列出：

```text
@mfcp-progress settle <第一个已合入PR链接> <第二个已合入PR链接>
```

随后由年度维护者使用 **Close issue → Completed** 关闭任务。
开放状态下，`settle` 评论作为待结算证据保存；完成关闭后 Bot 自动核算。
已经按 Completed 关闭的任务也可以通过新的 `settle` 评论结算。
按 Not planned 关闭的任务不结算。

结算需要满足：

- Assignee、难度标签和年度标签与任务记录一致。
- 已有指定 Mentor 的复现和验证验收，Mentor 当前仍有资格。
- PR 来自该年度支持的上游仓库，作者是任务负责人，且已合入默认分支。
- 每个补丁提交包含作者及 Mentor 的 DCO 签名。导师签名资料登记在年度
  `governance.json` 的 `mentors` 字段中。
- PR 未在其他有效结算中重复计分。

个人记录更新成功后，Bot 在原 Issue 中 @负责人并祝贺完成任务。
同时满足 L2 条件时，Bot 额外发表晋级祝贺。

## 撤销结算：使用 Reopen issue

任务尚未完成时，使用 GitHub 的 **Reopen issue**。Bot 自动创建撤销 PR，
经独立授权人员审核并合入后扣除原结算经验。再次结算需要在撤销 PR 合入
之后获得新的 Mentor 验证验收。

## 导师能力评估：endorse

独立 Mentor 在原任务 Issue 中发表，命令下面填写至少十个字符的实际结论：

```text
@mfcp-progress endorse @hongquan-prog L3

这里填写实际观察到的能力、对应证据，以及通过导师评估的理由。
```

L4 的导师评估格式：

```text
@mfcp-progress endorse @hongquan-prog L4

这里填写社区协作、指导新人等实际成果，以及通过导师评估的理由。
```

候选人不能评估自己。记录评估评论链接，供晋级申请引用。

## 面试通过：interview

由年度名单中的面试人员发表，面试人员同时需要属于 Mentors Team，
并且与该次导师评估者不同：

```text
@mfcp-progress interview @hongquan-prog L3 <公开面试结论链接>

这里填写本次面试考察范围、实际表现及通过结论，至少十个字符。
```

公开评论只记录可公开的结论和适当的引用，内部面试材料保存在受限位置。
将这条命令评论的链接用于晋级申请的 `interview` 参数。

## L4 推荐：recommend

推荐人必须已获 L3 或 L4 等级，同时属于 Mentors Team，并与候选人不同：

```text
@mfcp-progress recommend @hongquan-prog L4 <社区贡献证据链接> <指导新人证据链接>

这里填写实际协作经历、社区反馈与推荐理由，至少十个字符。
```

2026 年规则要求至少两名不同的合格推荐人分别发表评论，保留各自评论链接。

## 提交 L3 晋级审核：promote

由独立年度维护者发表，候选人需要满足年度任务、PR 和积分条件：

```text
@mfcp-progress promote @hongquan-prog L3 mentor <endorse评论链接> interview <interview评论链接>

这里填写申请晋级的实际依据，以及量化成果、导师评估和面试结论。
```

链接必须指向本仓库对应候选人、对应目标等级的真实评估命令评论。
Bot 创建晋级 PR，两名独立授权审核人员批准当前版本后按规则自动合入。

## 提交 L4 晋级审核：promote

由独立年度维护者发表，引用导师评估和至少两名推荐人的评论：

```text
@mfcp-progress promote @hongquan-prog L4 mentor <endorse评论链接> recommend <第一位推荐人的评论链接> <第二位推荐人的评论链接>

这里填写邀请或推荐依据、社区影响、指导新人经历和公开反馈。
```

Bot 通过晋级 PR 保存决定，人工审核条件按年度规则执行。

## 注册晋级使用原生 PR 流程

贡献者完成 Fork、提交本人注册 PR 并合入后，Bot 自动记录 L0 → L1，
在该 PR 中 @原作者，祝贺晋级并欢迎加入计划。这个流程无需 Mentor 参与，
也无需额外发表晋级命令。
