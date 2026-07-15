# tools/

Utility packages for Anitabi research. Each tool lives in its own subfolder.

| Folder | Purpose |
|---|---|
| [`probe-agent/`](./probe-agent/) | Anitabi `/lite` probe agent with Bangumi ranked seeding (EN + CHT docs) |

```bash
cd tools/probe-agent
py -3 -m pip install aiohttp
py -3 probe_agent.py                              # Bangumi ranked + seeds + neighborhood → Anitabi
py -3 probe_agent.py --seeds-only --dump-seeds bangumi_ranked_ids.txt
```

See [`probe-agent/README.md`](./probe-agent/README.md) for full CLI options.

Add new tools as `tools/<tool-name>/` with their own README.
