# 新项目接入清单

新增贡献项目时，同步维护以下内容，使项目展示、任务发布和验收结算使用一致的项目名称及上游目标。

| 内容 | 维护位置 | 核对事项 |
| --- | --- | --- |
| 项目资料 | `projects/<project>/README.md`、`projects/README.md` | 官方入口、源码仓库、实践方向、验证与贡献要求 |
| README 展示 | `README.md`、`README.zh-CN.md`、`images/` | 双语徽章、图文条目、图片替代文本、来源和生成说明 |
| 静态页面 | `site/content.mjs`、`site/index.njk`、`site/site.css` | 项目卡片、描述、跳转地址与不同宽度下的排列 |
| 项目标签 | `.github/labels.json` 与 GitHub 仓库的 Labels | 使用一致的 `project/<project>` 名称、颜色与说明；远端标签需要实际创建 |
| 任务表单 | `.github/ISSUE_TEMPLATE/01-task.yml` | 项目选项可选，任务原生 Type 为 `Task` |
| 创建任务技能 | `.agents/skills/mfcp-create-issue/SKILL.md` 与 `scripts/prepare.rb` | 项目名称映射到正确标签；核对年度和上游仓库准入 |
| 年度安排 | `programs/<year>/README.md`、`progression.md` | 项目资料入口、当前规则版本、上游仓库列表 |
| 验收规则 | `programs/<year>/rules/vN.json` | `upstream_repositories` 包含明确的上游 `owner/repo`，版本和生效时间唯一 |
| 参与和 Bot 说明 | `CONTRIBUTING.md`、`docs/program.md`、`docs/progression-bot.md` | 项目方向和结算要求与当前规则一致 |

已发布的年度规则保持原文件内容，扩展上游目标时新增规则版本。首次验收按命令时间选择生效规则，
任务记录保存规则版本、文件 SHA 和积分；后续结算使用该任务保存的规则。
项目标签用于分类，上游准入由 `upstream_repositories` 控制。验收还会核对默认分支合入、PR 作者、
每个提交的作者及导师 DCO，以及任务的负责人、难度和年度。

合并前运行仓库检查、测试和页面构建，核对双语链接、图文布局、表单选项与标签映射。
通过只读 GitHub 请求验证新增规则的选择和上游仓库身份，确认既有规则的内容与 SHA 保持一致。
合并后检查远端标签、默认分支表单和创建脚本的实际输出，核对页面发布结果。

Humanize 的项目标识为 `humanize`，标签为 `project/humanize`，2026 年上游目标为
`humanfia/humanize`，由 `2026.v3` 规则定义。

归入已有方向的上游项目沿用该方向的表单选项、项目标签和页面卡片，并补充资料与
年度仓库规则。openRuyi 归入 Linux，沿用 `project/linux`；`2026.v4` 接受
`openRuyi-Project/openRuyi` 的软件包 PR 和 `openRuyi-Project/homepage` 的文档 PR。
