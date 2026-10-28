<!-- SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission -->
<!-- SPDX-License-Identifier: MIT -->

# 任务评论模板

在原任务 Issue 中复制对应模板填写。申领流程见[贡献指南](../CONTRIBUTING.md#申领任务)。填写实际成果和验证证据，不适用的条目说明原因。

这些评论用于记录实际成果和评估依据。Bot 的阶段验收、经验结算与晋级操作
使用[简短命令](bot-command-examples.md)，命令中的证据链接可以引用这些评论。

## 进展更新

```markdown
### Progress update / 进展更新
- Completed work / 已完成内容：
- Evidence and links / 验证证据与成果链接：
- Current obstacles / 当前阻碍：
- Next actions / 下一步操作：
- Help needed / 需要的帮助：
```

## 成果提交

提交前按[提交规范](../CONTRIBUTING.md#提交格式与-dco)核对 DCO：作者及任务要求的导师
均使用本人真实姓名的英文全称签署，中文姓名使用完整拼音。通常将姓名
各部分的首字母大写，也可以将姓氏全部大写；
作者姓名和邮箱与其提交身份一致。

复核申请引用需要复核的评估评论，并补充依据。

```markdown
### Contribution submission / 成果提交
- Stage / 评估阶段（阶段评估、最终评估、复核申请）：
- Deliverables / 实际成果及对应验收条件：
- Validation / 版本、环境、命令、实际结果与限制：
- Upstream status / 上游贡献链接、状态与记录日期：
- Collaboration / 独立完成内容、导师指导与评审处理情况：
- Review request / 需要评估的事项及相关评论链接：
```

## 导师评估

导师引用本次成果提交评论，记录评估日期和结论。组织者据此复核，年度记录引用对应评论链接。

```markdown
### Mentor assessment / 导师评估
- Submission / 成果提交评论链接：
- Assessor and date / 评估人 GitHub 用户名与评估日期：
- Acceptance review / 各项验收条件的结论与证据：
- Remaining work / 仍需完成的事项：
- Level recommendation / 等级建议与依据（如适用）：
- Assessment result / 评估结论（阶段通过、最终验收通过、需要补充）：
- Next actions / 下一步操作与负责人：
```

## 组织者复核

组织者确认评估依据并注明后续安排。参与者有异议时，在原任务中引用复核评论并补充证据。

```markdown
### Organizer review / 组织者复核
- Assessment / 导师评估评论链接：
- Reviewer and date / 复核人 GitHub 用户名与复核日期：
- Review result / 复核结论与依据：
- Follow-up / 继续执行、补充证据或关闭任务的安排：
- Annual record / 年度记录链接：
```
