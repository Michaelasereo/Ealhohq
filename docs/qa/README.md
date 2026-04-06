# Ealho Therapy — QA documentation (Jira-aligned)

Use these files to **create Epics, Issues, and Test cases in Jira** (copy-paste or CSV import), and to run **manual QA** each release.

| Document | Purpose |
|----------|---------|
| [jira-epics.md](jira-epics.md) | Epic list, suggested labels/components, child issue groupings |
| [test-case-template.md](test-case-template.md) | Standard template for Preconditions / Steps / Expected / Evidence |
| [environment-and-test-data.md](environment-and-test-data.md) | Staging, env vars, seed accounts, discount codes |
| [smoke-tests-smk-01-05.md](smoke-tests-smk-01-05.md) | P0 smoke suite — run every release; log Pass/Fail + Bug links |
| [regression-suites-and-coverage.md](regression-suites-and-coverage.md) | P1 role-based suites + coverage tracking for Jira dashboard |

**Suggested Jira filters**

- `label = qa-smoke AND fixVersion = <release>`
- `label = qa-regression AND component = Web`
