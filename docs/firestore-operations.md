# Firestore production operations

## Runtime decision

- Local development: SQLite through the default app store adapter.
- Firebase Hosting + Cloud Run: `APP_STORE=firestore` is mandatory in the Cloud Run service.
- The production server entrypoint validates Firestore selection and required auth/session configuration before importing the Next server, preventing accidental use of ephemeral container storage.
- `/api/health` performs a real Firestore read; connectivity or permission failures return `503 runtime_not_ready` rather than a false-positive 200.
- Presence remains a rebuildable SQLite seed under `/tmp`; user, library, and trip data do not.

## Deployment verification

1. Enable Firestore in the `antiable-traceframe` project and confirm the `traceframe-web` Cloud Run service account has least-privilege access.
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
