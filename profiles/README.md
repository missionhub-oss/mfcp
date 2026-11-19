# Open-source highlights / 开源时刻

`profiles/<github_login>.json` supplements a participant record with public
open-source projects and dated milestones. It does not change MFCP level,
experience or task history. The build validates the file and renders it on the
participant profile page.

`profiles/<github_login>.json` 为参与者记录补充公开的开源项目与带日期的开源时刻，不改变
MFCP 等级、经验值或任务历史。站点构建时校验文件并渲染到个人履历页。

## Format / 格式

```json
{
  "github_id": 62325246,
  "github_login": "zevorn",
  "projects": [
    {
      "id": "qemu",
      "name": {"en": "QEMU", "zh": "QEMU"},
      "role": {"en": "Maintainer · Reviewer", "zh": "维护者 · 评审者"},
      "summary": {"en": "One line.", "zh": "一句话说明。"},
      "url": "https://gitlab.com/qemu-project/qemu/-/blob/master/MAINTAINERS"
    }
  ],
  "moments": [
    {
      "id": "qemu-k230-maintainer",
      "at": "2026-06-16T00:00:00Z",
      "project": "qemu",
      "kind": "maintainer",
      "title": {"en": "Became a QEMU K230 Machines maintainer", "zh": "成为 QEMU K230 Machines 维护者"},
      "summary": {"en": "Public evidence.", "zh": "公开证据。"},
      "url": "https://lore.kernel.org/qemu-devel/..."
    }
  ]
}
```

- `id` uses lower-case ASCII words separated by hyphens.
- `at` is an ISO 8601 timestamp with an offset; the site displays the UTC date.
- `kind` is `maintainer`, `reviewer` or `contributor`.
- `url` points to public upstream evidence such as a merged commit, PR, mailing-list message or project team page.
- Both English and Chinese text are required. Add one moment per verifiable event and sort is handled by the build.

- `id` 使用小写英文单词，以连字符分隔。
- `at` 使用带时区的 ISO 8601 时间，站点按 UTC 日期显示。
- `kind` 取 `maintainer`、`reviewer` 或 `contributor`。
- `url` 指向公开的上游证据，例如已合入的提交、PR、邮件列表邮件或项目团队页面。
- 中英文均须填写。每个可核验事件写一条记录，构建时自动按时间倒序排列。
