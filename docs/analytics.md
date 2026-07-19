# Product analytics

TraceFrame uses Google Analytics for Firebase through the Firebase Web SDK. Analytics is
disabled when the public Firebase configuration is incomplete, and events are sent only after
the visitor grants analytics consent in the site prompt.

## Configure

In Firebase Console, enable Google Analytics and register or select the TraceFrame web app.
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
| `trip_view` | An owner or shared trip was opened | `trip_id`, `view_type`, `duration_days`, `subject_count` |
| `trip_saved` | A trip was created or an edit was saved | `trip_id`, `duration_days`, `subject_count` |
| `trip_shared` | A share link was created or opened by its owner | `trip_id`, `share_action` |
| `anitabi_map_click` | An Anitabi map link was opened | `trip_id` when applicable, `subject_id`, `source` |

The analytics event vocabulary also reserves `curated_trip_impression`, `curated_trip_view`,
and `trip_copy_started` for the curated-trip gallery.

No Bangumi user identifier, OAuth token, share token, trip title, or other free-form user text is
sent to Analytics.

## View and verify

- Firebase Console -> Analytics -> DebugView for development verification.
- Firebase Console -> Analytics -> Events for aggregate counts.
- Google Analytics -> Explore -> Funnel exploration for conversion rates.

Suggested funnels:

```text
trip_create_started -> trip_saved -> trip_shared
trip_view -> anitabi_map_click
```

Register `view_type`, `source`, and `share_action` as event-scoped custom dimensions if those
parameters need to be used directly in reports and explorations.
