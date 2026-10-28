<div align="center">

<p><sub>PROCESS MISSION · OPEN SOURCE</sub></p>
<h1>Mission Forge Contributor Program（MFCP）</h1>
<p>
  <strong>Learn · Build · Contribute · Grow</strong><br>
  Develop engineering skills through real open-source contributions.
</p>

<p>
  <a href="projects/zephyr/README.md"><img src="https://img.shields.io/badge/Zephyr-7A51C2?style=flat-square" alt="Explore Zephyr"></a>
  <a href="projects/linux/README.md"><img src="https://img.shields.io/badge/Linux-315879?style=flat-square&amp;logo=linux&amp;logoColor=white" alt="Explore Linux"></a>
  <a href="projects/yocto/README.md"><img src="https://img.shields.io/badge/Yocto-168681?style=flat-square" alt="Explore Yocto"></a>
  <a href="programs/2026/README.md"><img src="https://img.shields.io/badge/Program-2026-d29922?style=flat-square" alt="Program 2026"></a>
</p>

<p><strong>English</strong> · <a href="README.zh-CN.md">简体中文</a></p>
<p>
  <a href="https://processmission-intern.github.io/mission-forge/">Website</a> ·
  <a href="docs/program.md">Get started</a> ·
  <a href="projects/README.md">Explore projects</a> ·
  <a href="programs/2026/README.md">Program 2026</a> ·
  <a href="CONTRIBUTING.md">Contribute</a>
</p>

</div>

---

MFCP is a contributor development program initiated by **Process Mission**.
It brings together open-source learning, mentorship, practical project work,
and contribution assessments to help participants build engineering experience.

This repository hosts participation guidelines, project resources, program
records, and contribution tracking. Code contributions go to the corresponding
upstream projects. Supporting guides are currently available in Chinese.

## Getting started: your first PR

> [!IMPORTANT]
> **Sign the DCO with your own real full name in English.** For a Chinese
> name, use the full Pinyin spelling of your real name. Normally capitalize
> the first letter of each name part, for example `Chao Liu`; an uppercase
> family name is also acceptable, for example `Chao LIU`.
> Your Git `user.name`, commit author name
> and `Signed-off-by` name must match. GitHub usernames and
> nicknames cannot substitute for your personal name. The sign-off email
> must match the commit author's email.

Fork this repository, create a branch, and add your own identity file using the
[registration guide](participants/README.md). Configure your Git author name
and email before committing. Every commit and PR title uses `module: subject`.
Every commit line must be **72 characters or fewer**, including the subject,
body and DCO trailer. Explain the change in the body after a blank line.

```text
participants: register your-username

Add my GitHub identity to join the contributor program.

Signed-off-by: Your Real Full Name <your-email@example.com>
```

Replace the example name with your own real full name in English and use your
author email. For a Chinese name, use your real name's full Pinyin spelling.
Normally capitalize the first letter of each name part, for example `Chao Liu`;
you may also capitalize the entire family name, for example `Chao LIU`.
The identity file's `github_login` field contains your GitHub username.
Run `git add` for your identity file,
then `git commit -s` to add your DCO sign-off. Push the branch to your fork and
open a PR against this repository's `main`. Use a matching `module: subject`
PR title. The required `Progression integrity` check validates every PR commit,
its author sign-off and the PR title. See [commit requirements](CONTRIBUTING.md#提交格式与-dco)
for corrections and long DCO identities. Maintainers use rebase merging to
preserve validated commit messages.

## Explore the projects

Choose a project and build experience through practical contributions.

<table width="100%">
  <tr>
    <td width="50%" valign="middle">
      <h3><a href="projects/zephyr/README.md">Zephyr</a></h3>
      <p><strong>Build for the real-time world.</strong></p>
      <p>Explore board support, drivers, and samples. Validate behavior on embedded platforms and improve tests and documentation.</p>
      <p><a href="projects/zephyr/README.md">Explore Zephyr →</a></p>
    </td>
    <td width="50%" align="center" valign="middle">
      <a href="projects/zephyr/README.md"><img src="images/zephyr.png" width="100%" alt="Zephyr: a development board inspired by the community's nRF52840 DK photograph"></a>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center" valign="middle">
      <a href="projects/linux/README.md"><img src="images/linux.png" width="100%" alt="Illustration of a penguin beside a processor and circuit traces"></a>
    </td>
    <td width="50%" valign="middle">
      <h3><a href="projects/linux/README.md">Linux</a></h3>
      <p><strong>Understand the kernel through practice.</strong></p>
      <p>Investigate issues, work on drivers, and contribute tests and documentation through the kernel community's review process.</p>
      <p><a href="projects/linux/README.md">Explore Linux →</a></p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="middle">
      <h3><a href="projects/yocto/README.md">Yocto Project</a></h3>
      <p><strong>Build an embedded Linux system.</strong></p>
      <p>Work with recipes and layers, assemble images, and validate builds for a target platform.</p>
      <p><a href="projects/yocto/README.md">Explore Yocto Project →</a></p>
    </td>
    <td width="50%" align="center" valign="middle">
      <a href="projects/yocto/README.md"><img src="images/yocto.png" width="100%" alt="Yocto Project: an embedded computer and mountains inspired by the official website"></a>
    </td>
  </tr>
</table>

## Start contributing

1. **Register through a PR.** Fork this repository, add your GitHub identity
   file under [`participants/`](participants/README.md), and submit a registration
   PR. Participation starts after maintainer review and merge.
2. **Choose a project.** Read the [participation guidelines](docs/program.md),
   explore the project guides and review the
   [Program 2026](programs/2026/README.md).
3. **Claim a task.** Find an open Issue with native type `Task`, then filter
   by project and difficulty.
   Comment with your experience, availability and development environment.
   After mentor confirmation, a maintainer assigns the Issue to you and records
   the agreed scope and goals. See the [claiming guide](CONTRIBUTING.md#申领任务).
4. **Build and share evidence.** Complete the work, record actual validation
   results, and link upstream submissions for review and assessment.

Unregistered accounts' issues are automatically closed and their issue comments
are automatically deleted. PR discussions remain open. Processing occurs after
submission, so content may briefly be visible. Registration is a participation
prerequisite; contributor levels are assessed through task outcomes.

**2026 status:** Recruitment has yet to be announced. Dates, mentors, available
tasks, and incentives will be published in the [annual program](programs/2026/README.md).

## Grow through practice

| Area | What you will find |
| --- | --- |
| [Contributor levels](docs/levels.md) | L0–L4 capability descriptions and evidence for progression |
| [Assessments](docs/assessment.md) | Criteria for engineering quality, validation, collaboration, and impact |
| [Mentorship](docs/mentorship.md) | Mentor and participant responsibilities, communication, and coordination |
| [Stipends and rewards](docs/stipends.md) | Requirements for announcing incentives and payment conditions |

## Find your way around

| Directory | Contents |
| --- | --- |
| [`docs/`](docs/program.md) | Participation, levels, assessments, incentives, and mentorship |
| [`projects/`](projects/README.md) | Long-term learning resources and practical guidance for each project |
| [`programs/`](programs/README.md) | Annual program announcements, assessments, and contribution records |

The repository organization draws on [CNCF Mentoring](https://github.com/cncf/mentoring),
keeping program guidance and historical records together in one repository.

## Join the contributor group

<div align="center">

<p>
  Scan with Feishu to join<br>
  the MFCP contributor group.<br>
  Ask questions and share your progress.
</p>

<p>
  <a href="images/mfcp-feishu-group.png"><img src="images/mfcp-feishu-group.png" width="360" alt="QR code for joining the MFCP open-source contributor group on Feishu"></a><br>
  <sub>Click the image to view it at full size.</sub>
</p>

<details>
  <summary>Explore resources in the group</summary>
  <p>
    Past community discussions<br>
    Meeting and event recordings<br>
    Presentation slides and learning materials
  </p>
</details>

</div>
