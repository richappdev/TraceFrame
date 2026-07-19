# Firestore production operations

## Runtime decision

- Local development: SQLite through the default app store adapter.
- Firebase Hosting + Cloud Run: `APP_STORE=firestore` is mandatory in the Cloud Run service.
- The production server entrypoint validates Firestore selection and required auth/session configuration before importing the Next server, preventing accidental use of ephemeral container storage.
- `/api/health` performs a real Firestore read; connectivity or permission failures return `503 runtime_not_ready` rather than a false-positive 200.
- Presence remains a rebuildable SQLite seed under `/tmp`; user, library, and trip data do not.
- Runtime Anitabi verify writes durable Presence hits, queue, and negative-cache docs in Firestore (`antiable_presence`, `antiable_presence_queue`, `antiable_presence_negative`, `antiable_presence_meta`). SQLite still bootstraps from `valid-ids.csv` and merges Firestore overlays on open.

## Runtime Presence drain (Cloud Scheduler)

After library sync, unmatched Bangumi IDs are enqueued (cap 50 per sync). A background drain probes Anitabi `/lite` at reconcile-safe limits and never treats Cloudflare 403/429 as “missing”.

1. Create Secret Manager secret `PRESENCE_DRAIN_SECRET` (long random string) and grant the `anipin-web` service account access. `scripts/deploy-firebase-hosting.ps1` mounts it into Cloud Run.
2. Create a Cloud Scheduler HTTP job every 1–5 minutes:
   - Method: `POST`
   - URL: `https://<host>/api/internal/presence-drain`
   - Header: `Authorization: Bearer <PRESENCE_DRAIN_SECRET>`
   - Optional query: `?limit=5` (max 20)
3. Confirm a sync that produces 核對中 rows eventually becomes 已對應 or 未對應 after drain runs.

Local/dev (`APP_STORE` unset): queue uses an in-process memory backend; call the drain endpoint with the same secret after setting `PRESENCE_DRAIN_SECRET` in `.env.local`.

## Deployment verification

1. Enable Firestore in the `antiable-anipin` project and confirm the `anipin-web` Cloud Run service account has least-privilege access.
2. Create a trip, copy its share URL, redeploy, and verify both owner and anonymous reads.
3. Rotate then revoke the share token and verify old URLs fail.
4. Delete the test user through `/privacy`; verify user, library subcollection, trips, and public URLs are gone.

## Backup and recovery gate

Before production—not merely preview—configure scheduled managed Firestore exports to a project-owned bucket with retention and access controls. Record the bucket, schedule, owner, last successful export, and last restore exercise here. Until those values exist, production release remains blocked.

| Item | Value |
|---|---|
| Backup owner | Pending |
| Export bucket | Pending |
| Schedule / retention | Pending |
| Last successful export | Pending |
| Last restore exercise | Pending |

## Rollback

Roll back the pinned Firebase Hosting release and Cloud Run revision without changing the Firestore schema. Current documents are additive and schema-less. If a future release changes document shape, add a version field and a reversible migration before deployment. During migration, the existing App Hosting backend remains the secondary rollback path.
