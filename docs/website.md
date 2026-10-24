<!-- SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission -->
<!-- SPDX-License-Identifier: MIT -->

# MFCP Website

The public website is built with `npm run build:pages` and deployed from
`site-dist/` by `.github/workflows/pages.yml`. Pushes to `main` and manual
workflow runs publish a new snapshot. The first visit uses Chinese; the
language control remembers the visitor's English or Chinese preference.

Every push to `main` triggers validation, tests, a fresh build and deployment.
This includes merged registration, level, contribution, rule and website PRs.
The progression writer publishes with a GitHub App installation token, so its
direct updates and auto-merges also trigger the Pages workflow. Manual runs
publish only from `main`. Deployment jobs are serialized.

## Content and visual system

`site/index.njk` defines the page structure, `site/content.mjs` contains the
English and Chinese interface copy, and `site/site.css` defines responsive
layouts. `site/app.mjs` handles language, search and navigation.
The main sections cover the program, one contributor leaderboard, partners
and joining. Partners appear immediately after the leaderboard.
Detailed metrics, milestones and progression requirements expand within each
ranked entry. The footer contains one line of copyright and a GitHub link.

The palette comes from the supplied Process Mission presentation template:
primary red `#B22600`, accent `#E84C22`, black `#111111`, white `#FFFFFF` and
warm paper `#EEECE1`. Neutral shades and transparent overlays support the
web layout. The supplied transparent Process Mission PNG uses the page background.
Typography uses system sans-serif fonts with PingFang SC and Microsoft
YaHei fallbacks. The large headings, generous spacing and geometric
composition are informed by the supplied Humanfia website reference.

The hero mark floats while its rings rotate and the glow pulses. Mouse input
adds a small perspective tilt. Motion pauses outside the viewport and while
the tab is hidden; the system's reduced-motion preference keeps it static.
Sections and ranked entries reveal once on entering the viewport. Buttons,
project arrows and rows use small hover transitions with the same motion
preference. All content stays visible without JavaScript.
CSS and JavaScript URLs include the source commit to refresh cached assets
after each deployment.

Partner logos are stored locally under `site/assets/partners/`, preserving
their original PNG files and transparency. The independent partner section
shares the leaderboard's dark background, heading size, spacing and divider.
Each logo keeps its original colors and transparent background directly
within the dark section.
The Gevico logo comes from the [QEMU Camp organization profile](https://github.com/qemu-camp)
([original image](https://raw.githubusercontent.com/qemu-camp/.github/main/profile/assets/gtoc-logo-horizontal.png));
the HUST logo comes from the [QEMU Camp website](https://qemu.gevico.online/)
([original image](https://qemu.gevico.online/image/partners/hust.png)).
Each logo links to its community and has a visible bilingual name.
Program, leaderboard and partner headings have a red background that expands
from left to right when their section is hovered or contains keyboard focus.
Touch layouts show the background directly; reduced motion disables the transition.

## Published records and rankings

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
