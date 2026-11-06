# QEMU

QEMU 方向围绕系统仿真、板级与 SoC 模型、外设行为、启动流程、qtest 和文档开展实践。
贡献目标包括进程使命维护的 `processmission/qemu` 仓库，以及通过 `qemu-devel`
邮件列表评审的 QEMU 上游补丁。

## 项目入口

- [QEMU 官网](https://www.qemu.org/)
- [进程使命 QEMU 仓库](https://github.com/processmission/qemu)，默认分支为 `devel`
- [进程使命 QEMU 文档](https://processmission.github.io/qemu/)
- [QEMU 上游源码](https://gitlab.com/qemu-project/qemu)
- [QEMU 开发文档](https://www.qemu.org/docs/master/devel/index.html)
- [上游补丁提交指南](https://www.qemu.org/docs/master/devel/submitting-a-patch.html)
- [qemu-devel 邮件列表](https://lists.nongnu.org/mailman/listinfo/qemu-devel)：`qemu-devel@nongnu.org`
- [qemu-devel 邮件归档](https://lore.kernel.org/qemu-devel/)

## 实践与验证

开始任务前明确目标仓库、分支和完整提交 SHA，记录目标体系结构、机器型号、
固件、内核或客户机程序版本、主机环境与构建依赖。进程使命仓库支持围绕板级与
SoC 模型开展开发，具体机器及启动方式以其当前文档为准。

板级与外设任务需要依据芯片手册说明寄存器、复位、中断和启动行为。提交成果时
提供实际构建结果、完整启动参数、串口或运行日志，以及相关 qtest 或功能测试结果。
修复问题时记录复现步骤与验证结果；文档修改需要核对命令和示例的实际运行情况。

## 贡献与评审

面向进程使命仓库的修改通过 Pull Request 提交到 `devel`，按目标仓库规范完成
实现、测试与评审。面向 QEMU 上游的补丁按照提交指南基于当前开发分支准备，
通过 `MAINTAINERS` 和 `scripts/get_maintainer.pl` 确定维护者与抄送名单。
贡献者本人将补丁发送至 `qemu-devel@nongnu.org`，按评审意见维护完整补丁系列。

在原 MFCP 任务中保存目标版本、PR 或公开邮件线程链接、补丁系列版本、验证记录、
评审意见及最终合入提交 SHA。提交前阅读对应项目的贡献与代码来源要求，
作者和任务要求的导师按[本计划提交规范](../../CONTRIBUTING.md#提交格式与-dco)
使用本人真实姓名的英文全称签署 DCO，中文姓名使用完整拼音。

## MFCP 任务与结算

任务表单选择 `QEMU`，设置原生 Type `Task`、`project/qemu`、`2026`
及确认后的难度标签，分配唯一的已注册 Assignee，并配置独立导师。

[2026.v6](../../programs/2026/rules/v6.json) 接受 `processmission/qemu` 的
默认分支合入 PR。首次结算按命令时间保存规则版本，后续操作使用任务已记录的规则。
Bot 核对 PR 作者、提交归属、作者和导师 DCO，以及成果是否已经计分。
邮件列表链接用于记录上游评审与合入证据；当前自动结算使用已准入仓库的
GitHub PR 链接，具体条件见[年度规则](../../programs/2026/progression.md)。

任务发布与申领见[贡献指南](../../CONTRIBUTING.md)，年度安排见
[2026 年培养安排](../../programs/2026/README.md)。
