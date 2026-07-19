# AniTabi bounded presence verifier

This utility verifies a bounded set of Bangumi subject IDs against Anitabi's lightweight `/lite` endpoint. It is historical research tooling retained for controlled refreshes; it is not a crawler or bulk-enumeration tool.

## Mandatory operating rules

1. Use canonical seeds and a bounded Bangumi-ranked candidate list only.
2. Send requests sequentially with randomized 1.5–3 second gaps and a fixed identifying `User-Agent`.
3. Stop the entire run on the first HTTP 403, HTTP 429, Cloudflare page, or HTML challenge.
4. Never rotate proxies, change egress, spoof browser identities, or resume automatically after a block.
5. Cache results and reconcile every accepted hit against Bangumi before updating `valid-ids.csv`.
6. Prefer a written partner or bulk-data mechanism over repeated probing.

## API and validity rule

```text
GET https://api.anitabi.cn/bangumi/{subjectID}/lite
```

- `200` JSON with `pointsLength > 0`: candidate has Anitabi presence.
- `404`: candidate is not present.
- `403`, `429`, or an HTML challenge: stop the entire run; this is not an ID verdict.

## Usage

```bash
cd tools/probe-agent
py -3 -m pip install aiohttp

# Canonical seeds plus up to 200 ranked Bangumi anime, capped at 250 total.
py -3 probe_agent.py

# Verify only the 14 canonical reconciled seeds.
py -3 probe_agent.py --no-bangumi

# Build and inspect the bounded candidate list without calling Anitabi.
py -3 probe_agent.py --seeds-only --dump-seeds bangumi_ranked_ids.txt

# Apply a smaller hard cap.
py -3 probe_agent.py --max-candidates 50 --output valid_anitabi_ids.csv
```

The process exits with status `2` after an anti-abuse response. Partial verified hits are written before exit, but the interrupted run must be reviewed rather than merged automatically.

## CLI options

| Flag | Default | Description |
|---|---:|---|
| `--pages` | `4` | Ranked Bangumi pages to fetch, maximum 50 records per page |
| `--page-size` | `50` | Bangumi page size |
| `--sort` | `rank` | Bangumi browse order: `rank` or `date` |
| `--no-bangumi` | off | Verify only canonical local seeds |
| `--max-candidates` | `250` | Hard candidate cap; maximum allowed value is 500 |
| `--dump-seeds` | — | Write ranked Bangumi IDs for inspection |
| `--seeds-only` | off | Build candidates and exit without Anitabi requests |
| `--output` | `valid_anitabi_ids.csv` | CSV output for verified hits |

After a successful run, follow the reconciliation procedure in [`../../valid-id-list.md`](../../valid-id-list.md). The repository-wide data policy in [`../../docs/data-rights-matrix.md`](../../docs/data-rights-matrix.md) is authoritative.
