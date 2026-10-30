<!-- SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission -->
<!-- SPDX-License-Identifier: MIT -->

# 贡献指南

## 注册参与

先按[参与者注册说明](participants/README.md) Fork 仓库，提交仅包含本人 GitHub 身份文件的 PR。维护者审核合并后，可以创建 Issue 和发表评论，Bot 根据已合入的注册 PR 自动记录 L0 → L1 晋级。后续等级按年度规则评估。

未注册账号创建或重新打开的 Issue 会自动关闭，其新建或编辑的 Issue 评论会自动删除。PR 讨论用于注册沟通，保持开放。自动处理在提交后执行，内容可能短暂可见。

## 提交格式与 DCO

**参与者和导师必须使用本人真实姓名的英文全称签署 DCO。** 中文姓名使用
本人真实姓名的完整拼音。通常将姓名各部分的首字母大写，例如 `Chao Liu`；
也可以将姓氏全部大写，例如 `Chao LIU`。
作者的 Git `user.name`、
commit 的 `Author` 姓名和作者 `Signed-off-by` 中的姓名须一致；
作者的签署邮箱须与该 commit 的作者邮箱一致。导师追加签署时填写导师本人的
真实姓名与邮箱，并与年度登记的导师签署资料一致。GitHub 用户名、昵称和代号
不能代替个人真实姓名。身份文件中的 `github_login` 填写 GitHub 用户名。

所有 commit 及 PR 标题使用 `module: subject`。module 使用小写字母开头，
可以包含小写字母、数字、`/` 和 `-`，例如 `participants`、`docs`、`ci`。
subject 简洁说明修改。标题与正文之间空一行，正文说明具体修改和目的，
正文与末尾签署之间空一行。所有行最多 72 个 Unicode 字符，禁止制表符和行尾空白。

```text
participants: register your-username

Add my GitHub identity to join the contributor program.

Signed-off-by: Your Real Full Name <your-email@example.com>
```

将示例中的姓名替换为本人真实姓名的英文全称，中文姓名使用完整拼音。
通常将姓名各部分的首字母大写，也可以将姓氏全部大写；邮箱填写本人提交
使用的邮箱。在当前仓库配置：

```sh
git config user.name "Your Real Full Name"
git config user.email "your-email@example.com"
```

提交前使用 `git var GIT_AUTHOR_IDENT` 核对实际作者姓名和邮箱，使用
`git commit -s` 添加自己的 DCO，并用 `git log -1 --format=full` 检查提交结果。
签署者须本人确认 [Developer Certificate of Origin](https://developercertificate.org/)
声明，不能由维护者代签其他作者。DCO 表明贡献者确认有权提交这些内容。

姓名和邮箱较长时，Git 支持将邮箱放在以一个空格开头的续行：

```text
Signed-off-by: Your Real Full Name
 <your-email@example.com>
```

提交者确认姓名真实，维护者审核时核对英文全称或完整拼音、姓名大小写格式，
以及作者与签署信息的一致性。
CI 使用 Git 解析签署，逐行检查 72 字符限制；每个 commit 都需要解释正文
和作者本人的签署。检查覆盖 PR 全部提交，包括合并提交和 Bot 提交。
PR 修改代码作为数据读取，校验程序来自默认分支。

修正自己最新的提交时使用 `git commit --amend -s`，编辑标题和正文，
然后用 `git push --force-with-lease` 更新自己的 PR 分支。
多个提交需要修正时，使用交互式 rebase 逐个修改自己的提交。
需要同步上游时，执行 `git fetch upstream` 和 `git rebase upstream/main`。
维护者采用 rebase 合并以保留已验证的提交说明，禁止修改其他人的 DCO。

必过检查 `Progression integrity` 同时验证 commit 格式、DCO、PR 标题和
贡献记录权限；任一项失败都阻止合并。

错误注释与 Actions 页面摘要统一使用英文。检查失败时，打开对应检查的详情查看。
提交规范检查会一次列出所有提交的问题，标明提交编号、行号、列号、
实际内容及修复方法。`\r` 表示 CR 字符，`\t` 表示制表符；行宽超限会
显示实际 Unicode 字符数。作者 DCO 缺失或不匹配会单独列出。
修正原提交并推送后，CI 自动重新检查。PR 自动刷新检查使用同样的说明。

## 提出任务

通过[新建 Issue](https://github.com/missionhub-oss/mfcp/issues/new/choose) 选择实践任务提议、问题报告、改进建议或参与求助表单。提出实践任务时填写以下信息：

- 项目方向：Zephyr、Linux、Yocto 或 Humanize；openRuyi 的软件包、系统验证与文档任务选择 Linux。
- 问题背景：实际需求、已有问题链接和相关技术资料。
- 任务目标：需要实现的行为、涉及的范围和交付内容。
- 实践条件：所需知识、设备、开发环境和上游版本。
- 验收条件：运行步骤、预期结果和需要提交的验证证据。
- 协作安排：参与者、导师及计划时间；尚未确定的信息标记为待确认。

实践任务使用 GitHub 原生 Type `Task`。任务模板和创建脚本会填写该类型，
创建后请核对 Issue 侧边栏的 Type。类型设置完成后，新建任务、分配或取消
负责人会自动触发网站构建和发布。

开始任务前，由参与者与导师在 Issue 中确认范围和验收条件。

## 申领任务

1. 在开放的 Issue 中选择原生 Type 为 `Task` 的任务，再按项目和 `difficulty/level0` 至 `difficulty/level4` 标签筛选，阅读任务正文、Assignees 和最新讨论，确认导师已说明可以申领。难度依据见[任务难度](docs/levels.md#任务难度)。
2. 在原任务下发表评论，介绍相关经验、可参与时间、开发条件和对任务的理解。
3. 导师在评论中确认任务范围、验收条件、指导安排和约定目标；维护者设置一个 `difficulty/level0` 至 `difficulty/level4` 难度标签，以及一个四位数字年度标签，例如 `2026`。
4. 维护者将参与者的 GitHub 账号设置为唯一 Assignee，即完成任务分配。使用 `@mfcp-progress configure mentor @导师用户名` 独立指定 Mentor，Bot 更新 Issue 的导师区域；首次结算时读取 Assignee 和标签，保存任务记录。完整操作见 [Bot 命令示例](docs/bot-command-examples.md)。

申领通过 Issue 评论与 Assignee 完成。实际代码或文档修改通过对应仓库的 Pull Request 或上游规定的补丁流程提交。

Mentor 没有设置 Assignee 的仓库权限时，可以发表
`@mfcp-progress configure assignee @参与者用户名`，由 Bot 分配已注册且
参与过该 Issue 讨论的成员。命令作者需要属于 Mentors Team。

```markdown
### Participation request / 参与申请
- Relevant experience / 相关经验：
- Available time / 可参与时间：
- Development environment / 开发条件：
- Task understanding / 对任务的理解：
- Guidance needed / 需要的指导：
```

导师与维护者在评论中确认任务范围、验收条件、沟通安排和参与申请链接。
负责人以 Assignee 为准，难度和年度以标签为准，Mentor 通过 `configure`
命令指定。GitHub 时间线记录分配及标签操作。

多人协作时，导师明确各自负责的内容。每项自动计分任务设置唯一 Assignee；不同人员的独立交付使用关联 Issue 分别记录。

参与者暂停或退出时，在原任务中记录成果、阻碍与交接资料。已经配置计分的任务保留原负责人及成果历史，重新划分的独立任务另建 Issue 并设置 Assignee。

## 提交成果

上游代码遵循对应社区的贡献流程。本仓库接收课程资料、任务说明、实践记录和培养文档的修改。

提交本仓库的 Pull Request 时，说明内容用途，关联任务 Issue，并提供适用的验证结果。贡献记录应包含上游提交或讨论链接、当前评审状态、使用的版本和实际测试结果。

提交公开记录前，检查其中的个人信息、访问凭据和内部资料。薪酬协议及个人联系方式通过组织者指定的私有渠道处理。

进展更新、成果提交、导师评估与组织者复核均记录在原任务评论中，使用[任务评论模板](docs/task-comments.md)。维护者在任务正文维护最新进展和评估评论链接。成果审核并合入上游后，维护者发送 `@mfcp-progress settle <上游 PR 链接>`，Bot 校验、结算并自动关闭任务，再回复贡献者的完成祝贺；同时晋级时另发晋级祝贺。

## 更新培养记录

项目长期资料放入 `projects/<project>/`，每期安排与成果放入 `programs/<year>/`。每期记录引用项目资料，标注评估日期和贡献当时的状态。

新增贡献项目时，按[项目接入清单](docs/project-setup.md)同步维护项目资料、页面入口、任务表单、标签、创建技能及年度上游仓库规则。
