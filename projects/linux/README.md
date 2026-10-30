# Linux

Linux 方向包括内核贡献和 openRuyi 发行版实践，覆盖设备驱动、缺陷分析、
软件包维护、系统验证与文档。

## 上游入口

- [Linux 内核源码](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/)
- [Linux 内核官方文档](https://docs.kernel.org/)
- [openRuyi 官网](https://www.openruyi.cn/)与[文档中心](https://www.openruyi.cn/docs/)
- [openRuyi 软件包仓库](https://github.com/openRuyi-Project/openRuyi)
- [openRuyi 文档仓库](https://github.com/openRuyi-Project/homepage)

## openRuyi 实践

openRuyi 是面向 RISC-V 的 Linux 发行版。本方向接收软件包升级、新软件包制作、
QEMU 平台验证、问题修复和使用文档等任务。任务表单选择 `Linux`，使用
`project/linux`、年度和难度标签，并设置原生 Type 为 `Task`。

开始贡献前阅读[新贡献者指南](https://openruyi.cn/docs/guide/new-contributor-guide/)、
[打包规范](https://openruyi.cn/docs/guide/packaging-guidelines/)、
[软件包审核要求](https://openruyi.cn/docs/guide/review/ReviewGuidelines/)及
[目标仓库的 AGENTS.md](https://github.com/openRuyi-Project/openRuyi/blob/main/AGENTS.md)。
参与者须遵守 [AI 辅助贡献政策](https://openruyi.cn/community/policy/ai-contribution-policy/)，
本人审核成果、签署 DCO、提交上游 PR 和处理评审，按要求披露 Agent 使用情况。

打包任务记录上游版本或完整提交 SHA、源码来源与校验值、许可证、构建依赖、
目标体系结构及构建环境。提供真实的 `riscv64` RPM 构建结果、源 RPM 和二进制
RPM 的 `rpmlint` 输出，以及安装、运行、升级或卸载验证。平台测试还须记录
QEMU、固件、内核和系统镜像版本、完整启动参数及日志。

软件包修改提交到 `openRuyi-Project/openRuyi`，指南和测试文档提交到
`openRuyi-Project/homepage`。2026 年自 `2026.v4` 起接受这两个仓库的
默认分支合入 PR；首次验收及后续结算按[年度规则](../../programs/2026/progression.md)执行。

## 实践记录

任务开始前记录内核版本、目标体系结构、内核配置、运行平台和复现步骤。提交成果时提供实际构建及运行结果、相关验证记录和上游评审链接。

参与者按照目标子系统的贡献要求准备补丁，并通过相应社区渠道提交成果。
本计划的作者及任务要求的导师均使用本人真实姓名的英文全称签署 DCO，
中文姓名使用完整拼音；通常将姓名各部分的首字母大写，也可以将姓氏全部大写。
提交前按
[提交规范](../../CONTRIBUTING.md#提交格式与-dco)核对作者和签署信息。

任务发布方式见[贡献指南](../../CONTRIBUTING.md)，年度安排见 [programs/](../../programs/README.md)。
