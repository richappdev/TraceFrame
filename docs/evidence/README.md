# Sanitized release evidence

This directory contains reviewable, non-secret summaries used by repository and Notion status documents.

Raw generated artifacts remain under ignored `reports/` because browser smoke output can contain personal data, OAuth state, cookies, or active share URLs. Do not commit raw screenshots or reports without inspecting and redacting them.

Tracked summaries must include the source artifact name, checksum when available, date, commit, pass/fail result, known gaps, and no credentials or personal collection content.

- [`m0-coverage-2026-07-20.md`](m0-coverage-2026-07-20.md) — current 31-ID canonical Presence reconciliation.
- [`m0-coverage-2026-07-19.md`](m0-coverage-2026-07-19.md) — superseded 14-ID snapshot and historical top-200 overlap.
- [`m2-status-2026-07-19.md`](m2-status-2026-07-19.md) — automated implementation preflight and remaining hosted acceptance gates.
- [`hosted-smoke-2026-07-19.md`](hosted-smoke-2026-07-19.md) — unauthenticated production smoke against `web.app`; locale CDN/`__session` findings and follow-up.
