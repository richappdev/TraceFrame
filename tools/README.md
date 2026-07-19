# tools/

Utility packages for Anitabi research. Each tool lives in its own subfolder.

| Folder | Purpose |
|---|---|
| [`probe-agent/`](./probe-agent/) | Historical, bounded Anitabi `/lite` presence verifier (EN + CHT docs) |

```bash
cd tools/probe-agent
py -3 -m pip install aiohttp
py -3 probe_agent.py --no-bangumi                 # verify canonical seeds only
py -3 probe_agent.py --seeds-only --dump-seeds bangumi_ranked_ids.txt
```

The verifier stops the entire run on the first 403, 429, or challenge response. Proxy rotation, egress changes, browser fingerprint spoofing, and broad ID enumeration are prohibited.

See [`probe-agent/README.md`](./probe-agent/README.md) for full CLI options.

Add new tools as `tools/<tool-name>/` with their own README.
