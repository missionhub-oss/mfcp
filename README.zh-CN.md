<div align="center">

<p><sub>进程使命 · 开源社区</sub></p>
<h1>Mission Forge Contributor Program（MFCP）</h1>
<p>
  <strong>学习 · 实践 · 贡献 · 成长</strong><br>
  进程使命开源贡献者成长计划，通过真实开源贡献积累工程经验。
</p>

<p>
  <a href="projects/zephyr/README.md"><img src="https://img.shields.io/badge/Zephyr-7A51C2?style=flat-square" alt="探索 Zephyr"></a>
  <a href="projects/linux/README.md"><img src="https://img.shields.io/badge/Linux-315879?style=flat-square&amp;logo=linux&amp;logoColor=white" alt="探索 Linux"></a>
  <a href="projects/yocto/README.md"><img src="https://img.shields.io/badge/Yocto-168681?style=flat-square" alt="探索 Yocto"></a>
  <a href="programs/2026/README.md"><img src="https://img.shields.io/badge/Program-2026-d29922?style=flat-square" alt="2026 年培养安排"></a>
</p>

<p><a href="README.md">English</a> · <strong>简体中文</strong></p>
<p>
  <a href="https://processmission-intern.github.io/mission-forge/">计划网站</a> ·
  <a href="docs/program.md">开始参与</a> ·
  <a href="projects/README.md">探索项目</a> ·
  <a href="programs/2026/README.md">2026 年培养安排</a> ·
  <a href="CONTRIBUTING.md">贡献指南</a>
</p>

</div>

---

MFCP 由<strong>进程使命（Process Mission）</strong>发起，通过开源学习、导师指导、真实项目实践和贡献评估，帮助参与者积累工程经验。

本仓库管理参与规则、项目资料、培养记录和贡献追踪。代码贡献提交到对应项目的上游仓库。配套指南目前使用中文。

## 开始参与：提交第一个 PR

> [!IMPORTANT]
> **DCO 必须使用本人真实姓名的英文全称。** 中文姓名使用本人真实姓名的
> 完整拼音。通常将姓名各部分的首字母大写，例如 `Chao Liu`；也可以将
> 姓氏全部大写，例如 `Chao LIU`。
> Git `user.name`、commit 作者姓名和
> `Signed-off-by` 中的姓名须一致。GitHub 用户名、昵称和代号不能代替本人
> 真实姓名。签署邮箱须与 commit 作者邮箱一致。

Fork 本仓库并创建分支，按[注册说明](participants/README.md)添加本人身份文件。
提交前配置本人的 Git 姓名和邮箱。每个 commit 和 PR 标题使用
`module: subject` 格式；commit 标题、正文和 DCO 的每行均不得超过 **72 个字符**。
标题与正文之间空一行，正文说明修改内容和目的。

```text
participants: register your-username

Add my GitHub identity to join the contributor program.

Signed-off-by: Your Real Full Name <your-email@example.com>
```

将示例姓名替换为本人真实姓名的英文全称，中文姓名使用完整拼音。通常将
姓名各部分的首字母大写，例如 `Chao Liu`；也可以将姓氏全部大写，例如
`Chao LIU`。邮箱填写本人提交使用的邮箱。
身份文件中的 `github_login` 填写 GitHub 用户名。
使用 `git add` 暂存身份文件，运行
`git commit -s` 添加本人 DCO 签署，再推送到个人 Fork，向本仓库 `main`
提交 PR。PR 标题也使用 `module: subject`。
必过的 `Progression integrity` 检查会逐个验证 PR 中的 commit、作者 DCO
和 PR 标题。修正方法及较长 DCO 的换行方式见[提交规范](CONTRIBUTING.md#提交格式与-dco)。
维护者使用 rebase 合并，保留经过检查的提交说明。

## 探索实践项目

选择感兴趣的项目，通过实际贡献积累工程经验。

<table width="100%">
  <tr>
    <td width="50%" valign="middle">
      <h3><a href="projects/zephyr/README.md">Zephyr</a></h3>
      <p><strong>动手开发实时嵌入式系统。</strong></p>
      <p>探索板级支持、设备驱动与示例，在嵌入式平台上验证运行结果，完善测试与文档。</p>
      <p><a href="projects/zephyr/README.md">探索 Zephyr →</a></p>
    </td>
    <td width="50%" align="center" valign="middle">
      <a href="projects/zephyr/README.md"><img src="images/zephyr.png" width="100%" alt="Zephyr：参考社区 nRF52840 DK 照片绘制的开发板插图"></a>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center" valign="middle">
      <a href="projects/linux/README.md"><img src="images/linux.png" width="100%" alt="企鹅、处理器与电路走线插图"></a>
    </td>
    <td width="50%" valign="middle">
      <h3><a href="projects/linux/README.md">Linux</a></h3>
      <p><strong>通过实践理解内核。</strong></p>
      <p>分析实际问题，参与驱动开发，完善测试与文档，并按照内核社区的流程参与评审。</p>
      <p><a href="projects/linux/README.md">探索 Linux →</a></p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="middle">
      <h3><a href="projects/yocto/README.md">Yocto Project</a></h3>
      <p><strong>构建自己的嵌入式 Linux 系统。</strong></p>
      <p>编写配方、组织软件层、生成系统镜像，并针对目标平台验证构建结果。</p>
      <p><a href="projects/yocto/README.md">探索 Yocto Project →</a></p>
    </td>
    <td width="50%" align="center" valign="middle">
      <a href="projects/yocto/README.md"><img src="images/yocto.png" width="100%" alt="Yocto Project：参考官网蓝色山峦横幅绘制的嵌入式设备插图"></a>
    </td>
  </tr>
</table>

## 开始参与贡献

1. **通过 PR 注册。** Fork 本仓库，在 [`participants/`](participants/README.md) 添加本人 GitHub 身份文件并提交注册 PR，经过维护者审核合并后获得参与资格。
2. **选择实践项目。** 阅读项目资料，查看 [2026 年培养安排](programs/2026/README.md)。
3. **申领实践任务。** 选择原生 Type 为 `Task` 的开放 Issue，再按项目和难度筛选，在评论中说明经验、可参与时间与开发条件。导师确认后，维护者设置 Assignee，并记录约定范围与目标。操作步骤见[申领指南](CONTRIBUTING.md#申领任务)。
4. **完成实践并提交证据。** 记录实际验证结果，提供上游贡献链接，参与评审与成果评估。

未注册账号创建的 Issue 会自动关闭，其 Issue 评论会自动删除；PR 讨论保持开放。自动处理在提交后执行，内容可能短暂可见。注册是参与前置条件，贡献者等级按任务成果评估。

**2026 年状态：** 招募公告尚未发布。具体时间、导师、任务和激励安排将在[年度培养安排](programs/2026/README.md)中公布。

## 通过实践成长

| 培养内容 | 文档说明 |
| --- | --- |
| [贡献者等级](docs/levels.md) | L0–L4 的能力描述与晋升依据 |
| [贡献评估](docs/assessment.md) | 工程质量、验证、协作与成果价值的评估标准 |
| [导师指导](docs/mentorship.md) | 导师和参与者的职责、沟通与协调安排 |
| [津贴与奖励](docs/stipends.md) | 激励公告及发放条件的说明要求 |

## 查找仓库资料

| 目录 | 内容 |
| --- | --- |
| [`docs/`](docs/program.md) | 参与规则、贡献者等级、评估标准、激励规则与导师机制 |
| [`projects/`](projects/README.md) | 各项目长期使用的学习资料与实践指南 |
| [`programs/`](programs/README.md) | 历年培养公告、阶段评估与贡献记录 |

目录组织参考 [CNCF Mentoring](https://github.com/cncf/mentoring)，在主仓库内维护培养机制与历年记录。

## 加入贡献者交流群

<div align="center">

<p>
  使用飞书扫描二维码<br>
  加入 MFCP 开源贡献者交流群<br>
  交流入门问题、讨论任务、分享实践进展
</p>

<p>
  <a href="images/mfcp-feishu-group.png"><img src="images/mfcp-feishu-group.png" width="360" alt="MFCP 开源贡献者交流群飞书入群二维码"></a><br>
  <sub>点击图片可以查看原图</sub>
</p>

<details>
  <summary>加入交流群，查看往届活动与资料</summary>
  <p>
    往届社区交流内容<br>
    会议与活动回放<br>
    PPT 和相关学习资料
  </p>
</details>

</div>
