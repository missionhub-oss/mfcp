<!-- SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission -->
<!-- SPDX-License-Identifier: MIT -->

# MFCP Website

The public website is built with `npm run build:pages` and deployed from
`site-dist/` by `.github/workflows/pages.yml`. Pushes to `main` and manual
workflow runs publish a new snapshot. Changes to issues with the native GitHub
Issue Type `Task` also publish a new
snapshot, with an hourly refresh covering changes made by automation.
The first visit uses Chinese; the language control remembers the visitor's
English or Chinese preference.

Every push to `main` triggers validation, tests, a fresh build and deployment.
This includes merged registration, level, contribution, rule and website PRs.
The progression writer publishes with a GitHub App installation token, so its
direct updates and auto-merges also trigger the Pages workflow. Manual runs
publish only from `main`. Deployment jobs are serialized.

## Content and visual system

`site/index.njk` defines the page structure, `site/content.mjs` contains the
English and Chinese interface copy, and `site/site.css` defines responsive
layouts. `site/app.mjs` handles language, search and navigation.
The header navigation links to the MissionHub community portal at
`https://missionhub-oss.github.io/website/` in the same tab.
The main homepage sections cover the program, partners and joining.
The contributor leaderboard lives on its own `leaderboard/` page opened
in a new browser tab from the header and the homepage Contributors stat,
with `#leaderboard` and `#contributor-<login>` fragments on the homepage
redirecting to `leaderboard/`.
The project section opens with a visual L0–L4 contributor growth roadmap
map (winding trail on desktop, vertical timeline on mobile) followed by
Zephyr, Linux, Yocto Project, Humanize and QEMU.
On screens wider than 700 pixels, the first row contains Zephyr, Linux and
Yocto Project, and the centered second row contains Humanize and QEMU. All
project cards have the same width and spacing. Screens up to
700 pixels use one column.
Detailed metrics, milestones and progression requirements expand within each
ranked entry. The footer contains one line of copyright and a GitHub link.

The palette comes from the supplied Process Mission presentation template:
primary red `#B22600`, accent `#E84C22`, black `#111111`, white `#FFFFFF` and
warm paper `#EEECE1`. Neutral shades and transparent overlays support the
web layout. The header includes a daytime/nighttime theme toggle (`#theme-toggle`,
remembered in `localStorage` as `mfcp.theme`, defaulting to system
`prefers-color-scheme: light` when unset) whose daytime palette matches the
MissionHub warm paper band (`#EEECE1` background, `#141414` ink, `#4D4C47` muted
copy and `#B22600` accents), including warm-paper styling for the contributor
growth roadmap and light-mode partner logo contrast adjustments (such as
multiplying the RustSBI mark directly onto the paper background and inverting
white-only marks). The supplied transparent Process Mission PNG uses the page background.
Typography uses system sans-serif fonts with PingFang SC and Microsoft
YaHei fallbacks. The large headings, generous spacing and geometric
composition are informed by the supplied Humanfia website reference.

The hero mark floats while its rings rotate and the glow pulses. Mouse input
adds a small perspective tilt. Motion pauses outside the viewport and while
the tab is hidden; the system's reduced-motion preference keeps it static.
The mobile and tablet hero frames contain their decorative rings within the
viewport.
Sections and ranked entries reveal once on entering the viewport. Buttons,
project arrows and rows use small hover transitions with the same motion
preference. All content stays visible without JavaScript.
CSS and JavaScript URLs include the source commit to refresh cached assets
after each deployment.

Partner logos are stored locally under `site/assets/partners/`, preserving
their artwork and proportions. On desktop, the 20 partners wrap into four
compact rows of five; each incomplete row is centered with the same card
widths and spacing.
Renesas uses the supplied white transparent PNG;
SiFli uses the supplied blue transparent PNG. Both link to their official
websites. ReedPilot uses the supplied white transparent PNG, retaining its
original pixels and alpha channel. Its image is centered within the logo frame
to account for the transparent padding, and links to `https://www.reedpilot.com/`.
Kubuds Technology uses the supplied white SVG artwork on a transparent
background with a viewBox fitted to the mark, and links to `https://kubuds.io/`.
Jiachen Project uses the supplied transparent SVG, displayed in white within
the logo frame, and links to `https://rv2036.org/`.
Canaan Developer Community uses the supplied transparent PNG, recolored from
its navy ink to white so the artwork contrasts with the dark section, and links
to `https://www.kendryte.com/`.
dsh-TUI uses the standard pixel-whale frame from its
[README logo](https://github.com/ccch1mneyyy/dsh-TUI/blob/52b50464f9b9ca101033bfb3751f8d9178b25bf1/docs/assets/readme/logo-en.svg),
with the original path geometry, colors and MIT license. It links to
`https://dshtui.com/`. DSH Go uses the supplied pastel emblem as a clean
transparent PNG and links to `https://go.dshtui.com/`.
SpacemiT uses the supplied transparent SVG with green artwork and white
lettering, preserving its original viewBox and colors. It links to
`https://www.spacemit.com/` and is labeled 进迭时空 in Chinese.
Sipeed uses the supplied transparent SVG with red artwork, displayed at
its original 3000×538 proportions, and links to `https://sipeed.com/`.
The Chinese page labels it 矽速科技.
The independent partner section
shares the leaderboard's dark background, heading size, spacing and divider.
The logos appear directly on the dark section with transparent backgrounds.
The Gevico logo comes from the [QEMU Camp organization profile](https://github.com/qemu-camp)
([original image](https://raw.githubusercontent.com/qemu-camp/.github/main/profile/assets/gtoc-logo-horizontal.png));
the HUST logo comes from the [QEMU Camp website](https://qemu.gevico.online/)
([original image](https://qemu.gevico.online/image/partners/hust.png)).
Each logo links to its community and has a visible name that follows the
selected page language: official Chinese names on the Chinese page and
English names on the English page. Brands without an official Chinese name
keep their established spelling in both languages.
Program, leaderboard and partner headings have a red background that expands
from left to right when their section is hovered or contains keyboard focus.
Touch layouts show the background directly; reduced motion disables the transition.

## Recruitment

The header's Jobs link sits immediately to the right of Hall of Fame
(`Hall of Fame`, `Jobs`, `Events`) and navigates in the same browser tab to the
standalone `jobs/` page. The jobs index and each job detail page share the
website header, language control, GitHub account dialog and mobile navigation.
Every job posting is maintained as an independent Markdown file in the
top-level `jobs/` directory (`jobs/README.md` documents the schema and is
ignored by the builder).

Write each posting as `jobs/<slug>.md` with YAML front matter and a Markdown
body. Add an optional English translation at `jobs/<slug>.en.md` so switching
the site language displays the English title, metadata, table of contents and
body on the same `jobs/<slug>/` URL. The filename uses lowercase letters,
digits and hyphens, and maps to `jobs/<slug>/`. Optional local images live
under `jobs/assets/` and are validated with `image-size`. `gray-matter` reads
the metadata, `marked` renders the body and builds the section table of
contents, and `sanitize-html` restricts the published HTML to safe elements.
JavaScript front matter is rejected.

| Field | Meaning |
| --- | --- |
| `title`, `company`, `summary` | Role title, hiring organization and index description |
| `location` | Work location |
| `employment_type` | `full-time`, `intern`, `part-time` or `contract` |
| `published_at` | Publication date, quoted as `YYYY-MM-DD` |
| `status` | Optional `open` (default) or `closed` |
| `work_mode` | Optional `onsite`, `hybrid` or `remote` |
| `salary`, `experience` | Optional compensation range and experience requirement |
| `updated_at` | Optional update date, quoted as `YYYY-MM-DD` |
| `tags` | Optional list of skill or domain tags |
| `apply_url`, `apply_email` | Optional application link (`http`/`https`) and contact email |
| `featured` | Optional boolean to pin an open role at the top |

The build produces `site-dist/jobs/index.html`, `site-dist/jobs/<slug>/index.html`,
and copies `jobs/assets/` when present. `jobs` is reserved alongside the other
top-level site sections so per-username profile routes never shadow the
recruitment pages. See `jobs/README.md`, the example posting under
`jobs/example-embedded-systems-engineer.md`, and `.agents/skills/mfcp-post-job/`
for authoring and PR submission instructions.

## Events

The header's Events link opens the independent `events/` page in a new
browser tab. It includes the weekly schedule, all replay links, slides
and the Bilibili collection from `site/events.md`. The page shares the
website header, language control and mobile navigation. Local slide links
resolve from the new page to the existing `slides/` directory. Visits to
the homepage's `#events` fragment navigate to the events page.

## Task Plaza and GitHub account view

The highlighted Task Plaza call-to-action at the right end of the header
navigation opens the independent `tasks/` page in a new browser tab and
displays the count of currently available tasks. `scripts/lib/tasks.mjs`
classifies every native `Task` issue from the GitHub Issues API into
`available` (open with no assignees), `claimed` (open with assignees),
`completed` (closed as completed) or `closed`, resolves difficulty level,
program year, project tracks (from `project/*` labels with a fallback to
the `Project / 实践项目` section) and mentors, and renders sanitized
issue Markdown into `site-dist/tasks/index.html` and
`site-dist/tasks/tasks-data.json`.

Visitors can filter tasks by status, difficulty level (`L1`–`L4`), year,
project track, keyword search and sort order, open the full synced issue
content in a detail dialog (with `#task-<number>` deep links), or click
live sync to fetch the latest GitHub Issues state directly in the browser.

The header actions place language switching, the GitHub account control
powered by `site/account.mjs`, and at the far top-right a GitHub
repository link showing the live build-time Star count
(`stargazers_count` from the GitHub Repository API). Without any backend
server or token, visitors enter their GitHub username
(with autocomplete from published MFCP contributors) to match their
record in `site-dist/profile-index.json`, `tasks-data.json` and public
GitHub profile metadata (`https://api.github.com/users/<login>`), saved
in `localStorage` until refreshed or signed out.

Each registered contributor also gets a static open-source resume page
at `site-dist/<login-lowercase>/index.html` (with `404.html` redirecting
mixed-case username paths case-insensitively and `profile/` serving as
the sign-in and lookup entry). The top panel combines identity, level
progress bar (`L0`–`L4`), core completion metrics (`XP`, accepted tasks,
upstream PRs, mentored tasks, mentored completions) and the embedded
`ghfind` card, followed by four equal-sized scrollable/paginated panels:
participating open-source projects, participating tasks, concrete
open-source contributions (merged upstream PRs and recognitions) and
mentored tasks. Unregistered accounts see a
ready-to-copy `participants/<login>.json` registration snippet with
their `github_login` and `github_id`.

## News articles

The header's News link opens the independent `news/` page in a new browser
tab. The news index and each article share the website header, language
control and mobile navigation. Article text is authored in Chinese and
keeps its language when the surrounding interface is switched to English.

Write each article as `site/news/<slug>.md` with YAML front matter and a
Markdown body. The filename uses lowercase letters, digits and hyphens.
`gray-matter` reads the metadata, `marked` renders the body, and
`sanitize-html` limits the published HTML to article content. Images use
local paths under `site/assets/`; `image-size` supplies their dimensions.
JavaScript front matter is rejected.

| Field | Meaning |
| --- | --- |
| `title`, `summary` | Article title and index description |
| `category` | `community` or `partner` |
| `date` | Event or joining date, quoted as `YYYY-MM-DD` |
| `published_at` | Publication date, quoted as `YYYY-MM-DD` |
| `cover`, `cover_alt` | Local image path relative to the Markdown file and its alternative text |
| `featured` | Select an article for the index's featured position |
| `partner` | Partner CSS identifier for a partner article |
| `joined_at` | Partner joining timestamp with an explicit timezone |
| `source_commit` | Full commit SHA of the partner's first directory entry |

Partner joining times use the committer timestamp of the first commit on
the default branch that added the partner to `site/index.njk`. The article
date is calculated in `Asia/Shanghai`. Commit references remain in the
Markdown metadata for editorial verification.
Publication dates record when the news text is published. This keeps the
joining record distinct from the publication of a retrospective article.

The build produces `site-dist/news/index.html` and
`site-dist/news/<slug>/index.html`, sorting entries by event or joining
time. It recreates the generated news directory on each build.
Use relative image links such as
`../assets/news/beijing-meetup-2026-11-14-1.webp`; the builder resolves them
for the article URL. Place the title in front matter and use paragraphs
or level-two headings in the body.

The Beijing meetup article records the 2026-11-14 event, its expected
attendance of 20 and actual attendance of 16, and the supplied photographs.
Its visible participation note states that attendees joined as individual
community members and their participation and remarks do not represent
their employers or schools. Organization names describe personal work or
study backgrounds.

## Technical blogs

The header's Blogs link opens the independent `blogs/` page in a new browser
tab. The blog index and each article page share the website header, language
control, GitHub account dialog and mobile navigation. Blog articles are
maintained as Markdown files in the top-level `blogs/` directory so contributors
can author and review posts directly at the repository root.

Write each post as `blogs/<slug>.md` with YAML front matter and a Markdown body.
Add an optional English translation at `blogs/<slug>.en.md` so switching the
site language displays the English title, summary, author, table of contents and
body on the same `blogs/<slug>/` URL. The filename uses lowercase letters,
digits and hyphens, and becomes the article's standalone URL suffix
`blogs/<slug>/`. Images live under `blogs/assets/` and are referenced with
relative paths such as `assets/<slug>/slide-01.webp`, so previews work both on
GitHub and in the built website. `gray-matter` reads the metadata, `marked`
renders the body and builds the section table of contents, `sanitize-html`
restricts the published HTML to safe article elements, and `image-size` supplies
image dimensions. JavaScript front matter is rejected.

| Field | Meaning |
| --- | --- |
| `title`, `summary` | Post title and index description |
| `date` | Session or topic date, quoted as `YYYY-MM-DD` |
| `published_at` | Publication date, quoted as `YYYY-MM-DD` |
| `author` | Speaker or author attribution |
| `tags` | Optional list of topic tags |
| `cover`, `cover_alt` | Local image path under `blogs/assets/` and its alternative text |
| `featured` | Select a post for the index's featured position |
| `video_url` | Optional replay video URL |
| `slides_path` | Optional repository slide path under `slides/` |

The build produces `site-dist/blogs/index.html`,
`site-dist/blogs/<slug>/index.html`, and copies `blogs/assets/` into
`site-dist/blogs/assets/`. `blogs` is reserved alongside the other top-level
site sections so per-username profile routes never shadow the blog pages.

## Published records and rankings

The homepage shows Community members, Contributors, Total tasks and In progress.
Community members comes from the Feishu group's `user_count`.
The trusted source file `site/community.json` contains the count, an optional
`approximate` flag and the observation time. When `approximate` is true, the
homepage appends `+` to the displayed member count.
Refresh it using an authenticated local `lark-cli` session:

```sh
npm run refresh:community -- --chat-id <MFCP-chat-id>
```

The refresh command reads the group information API, validates the response
and updates the snapshot after a successful request. Commit the snapshot to
publish the refreshed count. Website builds use the most recent committed
snapshot; Feishu credentials and member identities stay outside the website.

Task statistics come from all pages of the repository's GitHub Issues API
at build time, using the `type=Task` API filter. Total tasks counts every issue
whose native GitHub Issue Type is `Task`. In progress counts
open task issues with at least one Assignee. Each issue counts once, including when
it has multiple Assignees. Pull requests and other issue kinds are excluded.
The desktop layout has four columns; screens up to 700 pixels use two columns.

Task issue creation, deletion, transfer, edits, assignment changes, closure,
reopening and label changes trigger a rebuild. Assigning an Assignee or removing
an Assignee runs the same build and deployment workflow. Setting the native
type to `Task` triggers a rebuild even when the issue was created without it.
Removing the `Task` type triggers a rebuild using the removed type in the event
payload, so the published count reflects the change. Other issue types skip
event-driven builds. Pushes to `main`, manual runs and hourly refreshes remain
available independently of issue type.

The task issue template sets `type: Task`, and the repository's issue preparation
script includes that field in its REST payload. After creation, verify that
GitHub returned `type.name: Task`; setting it requires repository push access,
and GitHub can silently omit it for other callers. A maintainer can set the
type afterward to trigger publication. The build uses the workflow's
GitHub token with read access to issues. Local builds can use `GITHUB_TOKEN`
or the public API without authentication. GitHub request or response validation
failures stop the build and preserve the previously published snapshot.

The build reads `participants/*.json` and the currently effective annual
rules. `normalizeProfile()`, `totals()` and `activeSettlement()` determine
the displayed values. Registration PRs are milestones; accepted task and
upstream PR totals come from active settlements. Reversed settlements do
not contribute to XP or accepted-work totals.

All registered contributors enter the single-column leaderboard immediately,
ordered by total recorded XP, including zero-XP records. Equal XP shares a
competition rank; usernames give ties a stable display order. The board uses
all recorded history. Searching keeps the published ranks unchanged.
The interactive list shows ten contributors per page. Search covers every
record and returns to the first page; language changes preserve the current
page. Without JavaScript, every record remains available in one list.

Profiles link to their source record at the built commit. Missing event
dates remain absent. Each milestone links to its original public evidence.
For L1 and L2, the page shows every quantitative next-level requirement;
the annual policy remains the authority for review requirements.

## Trusted builds

PR validation reads proposed contributor records as data. The page builder
loads templates, translations and assets relative to its own trusted source
directory. Proposed JavaScript receives syntax checks; proposed templates
are never executed by trusted PR validation. Changes under `site/` require
the same maintainer approval as automation changes.

The static page requires no API token or server-side account session.
Search operates on the published snapshot. Contributor record
updates continue through the repository's registration and assessment
workflows.
