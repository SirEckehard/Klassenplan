# 0042 – Contributions come in under a licence agreement

- **Status:** accepted
- **In place since:** — (the check runs once the workflow is on `main`)
- **Sources:** the funding plan discussed with the maintainer on 2026-11-10,
  [CLA.md](../../CLA.md), [CONTRIBUTING.md](../../CONTRIBUTING.md#licence-and-the-cla),
  `.github/workflows/cla.yml`

## Context

Klassenplan is published under the AGPL-3.0-or-later. On 2026-11-11 every
commit in the repository is the maintainer's, apart from Dependabot's version
bumps; no pull request or issue has come from anyone else. The maintainer
therefore holds every right to the code and may publish it under other terms as
well.

The funding plan relies on that: a paid version in an app store, whose terms
the AGPL does not fit, and a commercial licence for a vendor of school software.
The first contribution merged under the AGPL alone would end both: from then on
every such step needs that contributor's consent, and one contributor who
cannot be reached or says no blocks it for good.

German law shapes the agreement. Copyright cannot be transferred (§ 29 UrhG),
only rights of use granted, and a grant covers only the uses it names or that
its purpose requires (§ 31 (5) UrhG). Uses not known yet would need written
form (§ 31a UrhG).

## Decision

- **A licence, not an assignment** ([CLA.md](../../CLA.md)): the contributor
  keeps the copyright and grants the maintainer a non-exclusive, irrevocable,
  royalty-free right of use. The uses are named one by one, including
  licensing under terms that are not open source, and limited to the uses known
  at the time of the contribution. A patent licence and the consent to pass the
  rights to a successor (a company or association) come with it. German law,
  English text.
- **A promise in return:** whatever the maintainer publishes under other terms
  stays available under the AGPL-3.0-or-later or another licence approved by the
  Open Source Initiative.
- **Accepted per pull request** by ticking a box in
  `.github/pull_request_template.md`. The pull request on GitHub is the record;
  nothing is collected elsewhere.
- **Checked by `.github/workflows/cla.yml`**: on `pull_request_target`, so the
  check comes from the default branch and a pull request cannot change it; no
  permissions, no checkout, no third-party action. Bots and the repository's
  owner are exempt.

## Alternatives considered

- **No agreement, AGPL in and out** (the old line in CONTRIBUTING.md). Simplest
  for contributors, but every merge narrows what the project can do later.
- **A Developer Certificate of Origin alone.** It certifies where the code
  comes from, but grants no right beyond the AGPL.
- **Copyright assignment.** Not possible under German law, and it deters
  contributors more than a licence does.
- **CLA Assistant Lite** (`contributor-assistant/github-action`), which records
  signatures in a branch of the repository: archived in 2026.
- **cla-assistant.io:** one signature per person via GitHub login, but the
  signatures sit with a third party and the maintainer has to set it up there.
  Still possible later if pull requests become frequent.
- **A sign-off in every commit** (`git commit -s`) that refers to the CLA: the
  record would travel with the git history, but a forgotten sign-off means
  rewriting commits, which is a hurdle for a teacher fixing a translation in the
  browser.

## Consequences

- Contributors tick one box per pull request; a few will not contribute under a
  CLA on principle.
- The maintainer is bound by the promise in section 5 of the CLA: no
  contribution is ever published under proprietary terms only.
- The check only takes effect once the workflow is on `main`, the default
  branch, and it only marks the pull request; branch protection could make it
  required.
- A changed CLA gets a new version number and binds only contributions made
  after it was accepted.
- **Open:** authors in Germany keep a claim to fair remuneration that a contract
  cannot exclude (§ 32 UrhG). The exception for free licences to everyone
  (§ 32 (3) sentence 3 UrhG) covers the AGPL, not a licence to the maintainer
  for proprietary use. Before a contribution is used in a commercial deal, a
  lawyer should review the agreement.
