# Product analytics

AniPins uses Google Analytics for Firebase through the Firebase Web SDK. Analytics is
disabled when the public Firebase configuration is incomplete, and events are sent only after
the visitor grants analytics consent in the site prompt.

## Configure

In Firebase Console, enable Google Analytics and register or select the web app on project
`antiable-traceframe`. Product branding is AniPins; the Firebase project id stays
`antiable-traceframe`.
Copy its public SDK configuration into these build-time environment variables:

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
```

For local development, put them in `apps/web/.env.local`. For production, provide them to the
Next.js build that produces the Cloud Run image. They are public web identifiers, not secrets.

## Events

| Event | Meaning | Main parameters |
|---|---|---|
| `trip_create_started` | The create-trip form was submitted | `day_count`, `subject_count` |
| `trip_view` | An owner or shared trip was opened | `trip_id`, `view_type`, `duration_days`, `subject_count`, `template_id` when copied |
| `trip_saved` | A trip was created or an edit was saved | `trip_id`, `duration_days`, `subject_count`, `template_id` when copied |
| `trip_shared` | A share link was created or opened by its owner | `trip_id`, `share_action`, `template_id` when copied |
| `anitabi_map_click` | An Anitabi map link was opened | `trip_id` when applicable, `subject_id`, `source` |
| `curated_trip_impression` | A curated trip card entered the viewport | `trip_id`, `source` |
| `curated_trip_view` | A curated itinerary was opened | `trip_id`, `duration_days`, `subject_count` |
| `trip_copy_started` | A visitor chose to personalize a curated trip | `trip_id`, `source` |

Curated template attribution is persisted with the copied trip in SQLite or Firestore and
continues through create, owner/shared views, map clicks, later saves, and shares as the
`template_id` parameter.

No Bangumi user identifier, OAuth token, share token, trip title, or other free-form user text is
sent to Analytics.

## View and verify

- Firebase Console -> Analytics -> DebugView for development verification.
- Firebase Console -> Analytics -> Events for aggregate counts.
- Google Analytics -> Explore -> Funnel exploration for conversion rates.

Suggested funnels:

```text
curated_trip_impression -> curated_trip_view -> anitabi_map_click
curated_trip_view -> trip_copy_started -> trip_saved -> trip_shared
```

Use `curated_trip_view / curated_trip_impression` for the 20% gallery-open target,
`anitabi_map_click / curated_trip_view` filtered to `source=curated_trip` for the 15% map target,
and template-attributed `trip_saved / curated_trip_view` for the 5% copy/save target. Compare
`template_id=kyoto-uji-classics` with the two Tokyo template IDs in an Explore breakdown.

Register `view_type`, `source`, `share_action`, and `template_id` as event-scoped custom
dimensions if those parameters need to be used directly in reports and explorations.
