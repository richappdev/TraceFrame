# Data rights and commercialization gate

This is an engineering policy, not legal advice. A qualified reviewer or written partner agreement must approve the unresolved rows before commercial use.

| Data / behavior | Current MVP treatment | Commercial status | Required evidence |
|---|---|---|---|
| Bangumi subject ID and title metadata | Cache for library and display with credit | Review required under Bangumi API terms | Terms review and identifying User-Agent |
| Anitabi work-level Presence fields | Reconciled seed; title, city, centroid, counts, cover URL, verification date | **No monetization assumed** | Written scope analysis or Anitabi permission |
| Anitabi map URL | Deep-link only | Lower risk, still subject to site terms | Confirm linking/branding requirements |
| Anitabi POI detail and screenshots | Not stored or displayed | **Blocked** | Commercial license plus origin/content rights |
| `origin` / `originURL` submissions | Not stored in MVP | **Blocked** | Rights and attribution chain per source |
| User Bangumi collection | Encrypted-token access; private to user | Allowed only for requested product function | Privacy notice, deletion, retention policy |
| User trips and share tokens | Stored in Firestore; owner-controlled public token | Non-commercial beta only | Security acceptance and deletion test |
| Affiliate links / paid planner / exports | Disabled | **Blocked** | Written commercial-rights decision |

## Release rules

1. A Cloudflare 403 or challenge ends the refresh run. Do not rotate egress to continue enumeration.
2. Refresh only a bounded, curated candidate set; cache results and identify the client.
3. Do not fetch `/points/detail`, full-resolution screenshots, or build offline packs in M2.
4. Any commercial feature requires a dated decision record naming the reviewer and evidence.
