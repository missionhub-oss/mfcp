<!-- SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission -->
<!-- SPDX-License-Identifier: MIT -->

# Contributor progression bot

`mfcp-progress` verifies GitHub evidence and records contributor progress.
The repository ID is `1428030862`. Repository variables `MFCP_APP_ID` and
`MFCP_APP_SLUG` identify the App; `MFCP_BOT_ID` identifies its numeric bot user
ID. `MFCP_APP_PRIVATE_KEY` is an Actions secret.
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
Mentor eligibility. Mentor configuration and settlement require the mentor's
DCO metadata. A Team member can validate their assigned task and endorse
another contributor under the task and annual authorization rules.

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

Use GitHub Assignees to assign a task to exactly one registered contributor.
Set the native GitHub Issue Type to `Task`, apply one difficulty label from
`difficulty/level0` through `difficulty/level4`, and one four-digit year label,
such as `2026`. The year must have published rules.
These native fields determine the participant, difficulty and annual rules.
For new tasks the selected year must be the current Beijing calendar year or
a future year at the command timestamp. Published rules and labels must exist.
The preparation tool only offers current or future years and checks the current
date again when preparing a draft. Recorded tasks retain their original year
across calendar boundaries; replay uses each command's original timestamp.

A Mentor Team member without repository assignment permission can post
`@mfcp-progress configure assignee @username`. The bot verifies registration
and participation as the issue author or a commenter, adds the native Assignee,
then confirms the identity returned by GitHub. This operation does not require
the annual maintainer role. It applies to open task issues, preserves existing
owners and recorded contributions, and uses assignment events to avoid
replaying an old command after a later manual assignment or unassignment.

Post a new plain-text comment starting with a command on its first line.
For example, `@mfcp-progress configure mentor @zevorn` adds that mentor.
A bare numeric GitHub ID is also accepted: `configure mentor 62325246`.
Mentor configuration requires a task issue, an authorized maintainer and a
registered active Mentor Team member with one mentor entry in the command year's
`programs/<year>/governance.json`. The bot matches `mentors[].github_id` to the
verified GitHub ID and reads `signoffs` from the current default-branch commit.
Each entry contains `Name <email>`; the bot displays every registered entry
with a `Signed-off-by:` prefix in a copyable code block. Missing or duplicate
mentor entries, empty signature lists and multiline signatures stop configuration
with an explanatory error.
Assignee, difficulty and year may be set later. The bot updates the existing
`### Mentor / 导师` issue field with the mentor account and DCO, preserving
guidance and the rest of the body. The configuration command link is stored in a hidden HTML comment
for authorization checks. It replaces the TBD placeholder. 👍 confirms the update. Keep the
immutable command as authorization evidence. Multiple mentors can be added
through separate commands. Numeric GitHub IDs identify unique mentors, so
repeated commands preserve the original evidence and other mentors while
refreshing registered details. An identical body skips the issue update.
Acceptance and settlement verify every displayed mentor against their command,
resolve the contributor from the single Assignee and require independent mentors.

Reprocessing the original configuration command, including scheduled
reconciliation, fills in or refreshes its DCO from the registered metadata.
Existing account-only mentor sections remain valid authorization evidence.
Sections that display DCO must match the registered signatures during acceptance
and settlement. Publishing uses the same verified signatures as the proposal
and preserves edits to other issue fields made while validation runs.

| Command after `@mfcp-progress` | Authorization |
| --- | --- |
| `configure assignee @username` | Active Mentor Team member; target must be registered and participating in this issue |
| `configure mentor @username` | Annual maintainer and active Mentor Team member |
| `accept reproduction evidence-url ...` | Any configured independent active mentor |
| `accept validation evidence-url ...` | Any configured independent active mentor, after reproduction acceptance |
| `settle upstream-pr-url ...` | Annual maintainer and active Mentor Team member |
| `endorse @candidate L3` or `endorse @candidate L4` | Independent Mentor Team member |
| `interview @candidate L3 evidence-url` | Independent annual interviewer and Mentor Team member |
| `recommend @candidate L4 evidence-url ...` | Independent L3/L4 contributor and Mentor Team member |
| `promote @candidate L3 mentor comment-url interview comment-url` | Independent annual maintainer and Mentor Team member |
| `promote @candidate L4 mentor comment-url recommend comment-url comment-url ...` | Independent annual maintainer and Mentor Team member |

The endorsement, interview, recommendation and promotion commands require a
public explanation of at least ten characters below the command line. They
record a passing assessment; use ordinary comments to discuss incomplete
assessments. Promotion links identify the corresponding immutable comments in
this repository. Edited command comments are rejected. Quoted or fenced
examples do not execute. Links use HTTPS and may include comment anchors.

See [完整命令示例](bot-command-examples.md) for copyable comment templates,
native task assignment, acceptance, settlement and L3/L4 review examples.

The bot adds 👀 to the original command while processing or awaiting conditions.
Completed operations replace it with 👍. Failures remove the processing reaction
and receive a reply mentioning the command author and linking the original
comment. Pending conditions and review PRs also receive explanatory replies.
Only the bot's own reactions are changed. Assessment
commands validate the candidate, author and annual role before acknowledging
the evidence. Each command has at most one App-authored reply; retries update that
reply, and recorded success is retained. Reply delivery failures are retried
during reconciliation without awarding duplicate experience. Task-completion
and promotion congratulations remain separate notifications to the contributor.

Moderation identifies trusted feedback by App ID, or by the configured numeric
bot user ID when GitHub omits App metadata. An explicitly different App ID is
rejected. Other bots remain subject to registration checks.

Accept reproduction before validation. After validation and upstream merge,
post `settle` with the upstream PR URLs and close the issue as completed.
An open issue keeps the settlement command as evidence without awarding XP.
A maintainer must
close the issue for automatic close-event settlement; a maintainer can also
post a new settlement command after closure. Every upstream commit must be
attributed to the participant and include the author's and authorized mentor's
DCO sign-offs. The mentor signature must belong to the mentor who accepted the
latest validation stage. Each upstream PR receives credit once among active settlements.
The 2026 rules currently accept GitHub PRs in `zephyrproject-rtos/zephyr`.

First reproduction acceptance records the native Assignee, mentor command
proofs, difficulty and annual rule version in the contributor JSON. The
`mentors` array stores each unique mentor ID and authorization proof. Existing
records without that array use their original `mentor_id` and `configuration`.
The original fields remain unchanged, and further stage acceptance records
additional authorized mentors. Any configured independent mentor may accept a
stage after their configuration command. Acceptance and settlement revalidate
all recorded authorizations and current Team membership.
Acceptance and settlement require these issue fields to remain consistent with
the recorded task. Label or Assignee edits do not rewrite contribution history.
Correct accidental changes before continuing; use a separate issue for a new
independent assignment or delivery scope.

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
- `Contributor progression`: serializes writes and reconciles every ten minutes.
- `Contributor notifications`: serializes congratulations and retries hourly.
- `MFCP website`: validates records, tests, builds and deploys the bilingual
  GitHub Pages website after every push to `main`, including published level
  and contribution updates. See [website behavior](website.md).

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

After main changes and on a ten-minute schedule, `Refresh open PR checks` verifies every open PR again and
publishes the three required results and repository check on its actual head commit. This trusted
workflow has Checks write permission to report results; it executes no PR code
and receives no App private key. Existing PRs also receive current validation
without contributors reopening or updating them. Review approvals are read by
these default-branch scheduled workflows. GitHub may delay scheduled runs.

Main requires `JSON format and fields`, `validate` and `Progression integrity`
from GitHub Actions. PR authors do not need to update their branch after every
main change; trusted repository checks read the current proposed merge.
Automatic progression candidates still verify their parent against current
main immediately before publishing. A separate PR ruleset lets only
the progression App bypass the PR requirement. The App cannot bypass required
checks, force-push protection or deletion protection. App permissions are at
repository scope; trusted candidate validation restricts automatic changes to
one contributor record and positive L0–L2 updates.

Enable repository auto-merge for reviewed proposals and GitHub Pages with
GitHub Actions as its build source. Keep the `github-pages` environment limited
to the protected default branch. Populate annual maintainer, interviewer and
reviewer roles with real authorized people for their respective operations.
Record mentor DCO signature metadata before settlement. Mentor eligibility
comes from the Team; registration promotion uses merged PR evidence.

For read-only reconciliation, run `node scripts/progression.mjs --reconcile`
with `GITHUB_TOKEN` and `MFCP_APP_SLUG`. To process queued events, manually run
`Contributor progression` in Actions. To retry notifications, run
`Contributor notifications`. Published JSON is the source of truth; failed
notifications never roll back earned experience or create another promotion.

## Temporary branches

After a successful progression run, the bot deletes its completed temporary
branches. Automatic branches must have their head commit contained in main.
Reviewed branches may also be deleted after the matching PR has merged with
the same head commit, including squash merges. Cleanup requires bot authorship
and committer identity, a recognized `progress/auto/` or `progress/review/`
name, no open PR using the branch, and an unchanged head before deletion.
Protected branches and unfinished work are retained. Scheduled reconciliation
retries cleanup after interruptions. `node scripts/progression.mjs --cleanup`
previews eligible branches without deleting them.
