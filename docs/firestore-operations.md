# Firestore production operations

## Runtime decision

- Local development: SQLite through the default app store adapter.
- Firebase App Hosting: `APP_STORE=firestore` is mandatory.
- Production startup fails if Firestore is not selected, preventing accidental use of ephemeral container storage.
- Presence remains a rebuildable SQLite seed under `/tmp`; user, library, and trip data do not.

## Deployment verification

1. Enable Firestore in the `antiable-traceframe` project and confirm the App Hosting runtime service account has least-privilege access.
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

Roll back the App Hosting revision without changing the Firestore schema. Current documents are additive and schema-less. If a future release changes document shape, add a version field and a reversible migration before deployment.
