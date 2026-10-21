<!-- SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission -->
<!-- SPDX-License-Identifier: MIT -->

# Contributor progression bot

`mfcp-progress` verifies GitHub evidence and records contributor progress.
The repository ID is `1428030862`. Repository variables `MFCP_APP_ID` and
`MFCP_APP_SLUG` identify the App; `MFCP_APP_PRIVATE_KEY` is an Actions secret.
The App needs Contents, Issues and Pull requests write permissions and Checks
read permission, plus organization Members read permission. Install it on this
repository and approve the organization's permission update.

## Mentor authorization

Mentor eligibility comes from the active membership of
[processmission-intern/mentors](https://github.com/orgs/processmission-intern/teams/mentors).
The bot verifies organization ID `345787850`, Team ID `20231868`, the comment
author's numeric GitHub ID, and active membership for every command. GitHub
includes child-team members in this membership lookup. Pending invitations and
non-members have no command authority. Lookup failures stop the operation.
Removing a member revokes authorization for future commands and approvals.

Team membership grants Mentor eligibility. Task assignment and independent
review rules still apply; annual maintainer, interviewer and reviewer roles
remain additional requirements for their respective operations. L0 → L1
uses merged registration evidence and does not require Team membership.

The `mentors` entries in annual `governance.json` record GitHub identities and
authorized DCO signature strings for patch verification. They do not grant
Mentor eligibility. A Team member can validate their assigned task and endorse
another contributor; settlement also needs that mentor's DCO metadata.

## Registration

A merged registration PR from the contributor's fork triggers L0 → L1.
No mentor is required. The bot checks the PR author, original identity file,
fork origin and merge, then records the evidence in the contributor JSON.
The notification workflow congratulates and mentions that author in the
registration PR after the updated record is published.

Existing two-field registrations remain valid. Scheduled reconciliation checks
previously merged registration PRs. A contributor whose file was added directly
can submit a registration PR from their fork that expands their own record to
the complete, empty L0 schema. Historical achievements must be supported by
actual merged PRs.

## Task commands

Post commands as new comments on a `kind/task` issue. Edited command comments
are rejected. Put `@mfcp-progress configure` on the first line, followed by
exactly one fenced `json` block. Substitute actual registered usernames and
evidence URLs in the following field descriptions.

| Command | JSON fields | Authorization |
| --- | --- | --- |
| `configure` | `participant`, `mentor`, `difficulty` (0–4), `year` | Annual maintainer; assign the issue to its participant first |
| `stage` | `participant`, `stage` (`reproduced` or `validated`), `evidence` (URL array) | Assigned, authorized mentor |
| `settle` | `participant`, `pull_requests` (canonical upstream PR URL array) | Annual maintainer |
| `endorse` | `participant`, `level` (3 or 4), `passed` (true), `summary` | Independent authorized mentor |
| `interview` | `participant`, `level` (3), `passed` (true), `summary`, `reference` | Independent authorized interviewer |
| `recommend` | `participant`, `level` (4), `passed` (true), `summary`, `evidence` (URL array) | Independent registered L3/L4 contributor |
| `promote` | `participant`, `level` (3 or 4), `summary`, `mentor_comment`, plus `interview_comment` for L3 or `recommendations` for L4 | Independent annual maintainer |

Summaries contain at least ten characters. `mentor_comment`,
`interview_comment` and entries in `recommendations` link to the corresponding
immutable evidence comments in this repository. Store private interview notes
outside the public repository; publish only the outcome and an appropriate
reference.

Accept reproduction before validation. After validation and upstream merge,
post settlement evidence and close the issue as completed. A maintainer must
close the issue for automatic close-event settlement; a maintainer can also
post a new settlement command after closure. Every upstream commit must be
attributed to the participant and include the author's and authorized mentor's
DCO sign-offs. Each upstream PR receives credit once among active settlements.
The 2026 rules currently accept GitHub PRs in `zephyrproject-rtos/zephyr`.

Reopening a credited task creates a reversal PR. Experience is deducted only
when the PR merges. A fresh mentor validation after the reversal merge is
required before another settlement. L3/L4 promotions and all changes for
contributors already at L3/L4 use reviewed PRs. Reviews must approve the
current PR revision, come from authorized people, and be independent of the
participant. The bot enables auto-merge after these conditions pass.

## Workflow and branch controls

- `Registration`: JSON and GitHub identity checks for participant PRs.
- `Progression integrity`: validates source evidence, authorization and
  immutable annual rules using trusted default-branch code.
- `Automatic progression checks`: validates candidate commits before main
  can advance. All three required check names run under GitHub Actions.
- `Contributor progression`: serializes writes and reconciles every six hours.
- `Contributor notifications`: serializes congratulations and retries hourly.
- `Contributor directory`: builds and deploys the public GitHub Pages directory.

PR checks run automatically on `pull_request_target`, including for first-time
contributors. Validation code and npm dependencies come from the default branch.
The repository check reads selected regular files from the proposed merge
through the GitHub API, validates contributor
JSON and rules, checks JavaScript syntax without running submitted scripts,
and builds the directory with trusted code. Mentor-dependent validators receive
a separate read-only membership token minted by a trusted composite action.
The App private key is passed only to that action; it is never passed to PR
files or validation scripts. Runtime changes execute after reviewed merge to main.
The public-repository approval setting still applies to any future workflow
that uses `pull_request` to execute contributor-supplied code.

After main changes, `Refresh open PR checks` verifies every open PR again and
publishes the three required results and repository check on its actual head commit. This trusted
workflow has Checks write permission to report results; it executes no PR code
and receives no App private key. Existing PRs also receive current validation
without contributors reopening or updating them.

Main requires `JSON format and fields`, `validate` and `Progression integrity`
from GitHub Actions with an up-to-date base. A separate PR ruleset lets only
the progression App bypass the PR requirement. The App cannot bypass required
checks, force-push protection or deletion protection. App permissions are at
repository scope; trusted candidate validation restricts automatic changes to
one contributor record and positive L0–L2 updates.

Enable repository auto-merge for reviewed proposals and GitHub Pages with
GitHub Actions as its build source. Keep the `github-pages` environment limited
to the protected default branch. Annual mentor and reviewer rosters must be
populated with real authorized people before mentor-dependent operations can
succeed. An empty mentor roster does not prevent registration promotion.

For read-only reconciliation, run `node scripts/progression.mjs --reconcile`
with `GITHUB_TOKEN` and `MFCP_APP_SLUG`. To process queued events, manually run
`Contributor progression` in Actions. To retry notifications, run
`Contributor notifications`. Published JSON is the source of truth; failed
notifications never roll back earned experience or create another promotion.
