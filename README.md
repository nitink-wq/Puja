# Pooja Fake-Door Test

Mobile-first mweb page for testing whether users click into and try to pay for
poojas. No real payments, no payment fields. There IS now a small backend -
see Event capture below - it exists only to persist analytics events to
Postgres; it has no other role (no auth, no payment logic).

Vanilla HTML/CSS/JS frontend, no build step. Hash routing: `#/list`,
`#/pooja/:id`. Once a user has ever hit "slots full", every route (any hash)
is intercepted and shows a persistent waitlist screen instead - see Waitlist
gate below.

## Run locally

Frontend only (no event capture, no DB, **no waitlist gate** - it fails open
without a backend, see Waitlist gate below):
```
cd pooja-fakedoor
python3 -m http.server 8123
```
Open `http://localhost:8123/?user_id=demo123&variant=a`.

Full stack, including the event-capture and waitlist-gate APIs (`node` + `pg` required):
```
cd pooja-fakedoor
npm install
DATABASE_URL=postgres://... node server.js
```
Without `DATABASE_URL` set, `node server.js` still runs fine - events log to
console instead of writing to Postgres, and the waitlist gate uses an
in-process `Map` instead of the `waitlist` table (still server-side, just
resets whenever the server restarts).

## URL params

| Param | Values | Notes |
|---|---|---|
| `user_id` | any string | Passed through untouched (not decoded) into every tracked event, used as the key for the waitlist gate (see below), and stored as the `user_id` column on every captured DB event. |
| `variant` | `a` or `b` | Drives pricing - see Pricing below. Defaults to `a` if missing/invalid (fires a `variant_missing` event when that happens). |
| `recharge_count` | any string | Passed through untouched into every tracked event/DB row. Not used for any UI logic today, just captured for analysis. |

There is no `home_deeplink` param anymore - see "Exiting back to the app" below for how leaving the WebView works now.

### Example URL

```
https://example.com/?user_id=USER123&recharge_count=3&variant=a
```

Deep-linking straight to a pooja also works, e.g.:
```
https://example.com/?user_id=USER123&variant=b#/pooja/kaal-sarp-dosh-nivaran
```

## Pricing (variant-driven, per Nitin's spec)

Every pooja has an explicit price per variant in `pricing.js` (`PRICE_TABLE`) -
no discount percentage or "compare at" MRP is computed or shown, since none
was supplied (inventing one would be a fake discount):

| Pooja | Variant A | Variant B |
|---|---|---|
| Grah Dosh Nivaran | ₹500 | ₹1500 |
| Buri Nazar Nivaran | ₹500 | ₹1500 |
| Navgrah Shanti | ₹500 | ₹1500 |
| Kaal Sarp Dosh Nivaran | ₹500 | ₹1500 |
| Prem Milan (recommended/hero) | ₹750 | ₹2100 |

Change the numbers directly in `pricing.js` `PRICE_TABLE`. Which pooja is the
featured hero card is still controlled separately by the `recommended: true`
flag in `poojas.js` - moving that flag doesn't change its price, since price
is now looked up per-pooja-id, not per-recommended-flag.

## Waitlist gate (hard block on repeat bookings)

The goal: once someone has tried to book and hit "slots full," don't let them
attempt to book again - this test measures intent, not repeat clicks.

**This is server-side, not client `localStorage`** - deliberately, so a user
can't unlock themselves by clearing browser storage or switching devices:

- The moment the Pay Now loader finishes, `app.js` POSTs `{user_id, pooja_id, pooja_name}` to `/api/waitlist`, which upserts a row into the Postgres `waitlist` table (`server.js`) keyed by `user_id` (`PRIMARY KEY`, so one record per user, first submission wins).
- On every page load, `app.js` does `GET /api/waitlist?user_id=...` **before the first render** and caches the result in memory for that page load. If it comes back `onWaitlist: true`, every route - `#/list`, `#/pooja/:id`, any hash - shows the waitlist screen instead of the normal router. There is no way back into List or Detail for that `user_id` from any device or browser once the row exists.
- Without `DATABASE_URL` set (local dev without a real DB), the same logic runs against an in-process `Map` in `server.js` instead of Postgres - still server-side, just doesn't survive a server restart.
- Without a backend at all (e.g. testing via the plain Python static server, `_devserver.py`), the `GET`/`POST` calls fail and `app.js` **fails open** (treats it as "not on the waitlist") so local frontend-only testing doesn't hard-break - but this means the gate itself can't be demoed without running `node server.js`.
- Different `user_id` values are fully isolated from each other.
- Fires a `waitlist_gate_view` event (deduped once per browser session, same as other `*_view` events) - see Events below.
- "Back to Home" on the waitlist screen still works (leaves the app entirely - see "Exiting back to the app" below).

**Resetting it for a specific user** (e.g. to retest): delete their row from
the DB - `DELETE FROM waitlist WHERE user_id = 'USER_ID_HERE';` - via the
Devtron pod terminal using `node` + `pg` (no `psql` in the `node:24-alpine`
image):
```
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : false });
pool.query('DELETE FROM waitlist WHERE user_id = \$1', ['USER_ID_HERE'])
  .then((r) => { console.log('deleted rows:', r.rowCount); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
"
```
Or just use a fresh, never-used `user_id` - simpler for most retesting.

## Exiting back to the app (React Native WebView)

This page loads inside a React Native WebView in the AstroLokal app. Two
places "exit" the page: the header back button (when it's pointed at home -
List and Waitlist screens) and the waitlist screen's "Back to Home" CTA. Both
go through a shared `exitToHome(source)` helper in `app.js`, matching the
pattern used in `bhagya-score`:

- **Bridge first, always**: `sendBackAction()` checks for `window.ReactNativeWebView` and, if present, `postMessage`s `{ action: "GO_BACK" }` and returns `true`. The native side is expected to pop this WebView screen directly - **not** navigate via deeplink - when it receives that message. This is the fix for the actual bug: firing the deeplink from inside the WebView stacks a *new* Home screen on top of this one, so hardware back just returns here instead of leaving. Check how the app currently handles `GO_BACK` (it should already, since `bhagya-score` uses it); add the handler on the native side if it's missing.
- **Deeplink only as a fallback**: if `window.ReactNativeWebView` isn't present (page opened in a plain browser, not the app's WebView), `exitToHome` falls back to `DEEPLINK_SCHEME` (`astrolokal://BottomTabs?screen=Home`, hardcoded in `app.js`) with `&source=<origin>` and `&user_id=<id>` (when available) appended for native-side debugging.
- There is no `home_deeplink` URL param or `CONFIG.HOME_DEEPLINK` anymore - both were replaced by this fixed, always-correct scheme now that the primary path is the bridge, not a configurable deeplink.

## Where to change things

- **Prices**: `pricing.js` `PRICE_TABLE` - see Pricing section above.
- **Pooja copy/content**: `poojas.js` - one object per pooja (what it does, duration, mode, what's included, rating, users booked, tag). Language is kept plain/simple for tier-2/3 city readers - specific to the ritual, not generic filler, and light on heavy Sanskrit/astrology jargon. Max 5 poojas.
- **Screen copy** (headers, trust line, waitlist gate, loader text): `copy.js`.
- **Deeplink fallback scheme**: `DEEPLINK_SCHEME` constant in `app.js` - see "Exiting back to the app" above.
- **PostHog key**: `config.js`.
- **Pooja images**: `pooja-art.js` - `window.POOJA_ART[id]` is an array of image URLs per pooja (first one doubles as the list-card thumbnail). All 5 poojas currently have 2 real photos each (main ritual shot + samagri/ingredients infographic). Add a 3rd or swap in new photography any time - just edit the array, no other code changes.
- **Astrologers**: `astrologers.js` - 6 astrologers total (real photos), 3 rotated in per pooja via `getAstrosForPooja`. Users can switch between the 3 via the "Change" bottom sheet on the detail page. `rating` fields are placeholder numbers, flagged in a comment.
- **Logo**: `assets/astrolokal-logo.png` (from the real app, resized to 120×120).
- **Design tokens** (colors, fonts, radii, shadows, spacing, background gradient, type scale): `tokens.css`. Do not add new colors/fonts/component styles outside this file - `styles.css` only consumes tokens.
- **Analytics provider**: `CONFIG.ANALYTICS_PROVIDER` in `config.js` (currently `posthog`). Add a new adapter function in the `PROVIDERS` object in `analytics.js` to swap providers.

## Image optimization (slow 3G)

Pooja photos use tiered compression based on when the user sees them:

- **Main shot** (hero card / grid card / carousel slide 1 - seen immediately): resized to 640px wide, WebP quality 65. ~33-50KB each.
- **Item/samagri shot** (carousel slide 2 only - seen a moment later, after the user has already waited through slide 1): resized to 720px wide, WebP quality 82. ~87-115KB each. Slightly heavier on purpose, since it doesn't block the first paint.

Total for all 10 pooja photos: ~725KB. The astrologer photos (480x480, quality
78) and logo were similarly downsized. The first/above-the-fold image on each
screen loads eagerly with `fetchpriority="high"`; everything else below the
fold uses `loading="lazy"`. All `<img>` tags carry `width`/`height` to avoid
layout shift.

If you add new photography, source at 1200px+ wide (landscape or square, not
portrait - it gets center-cropped into 3 different aspect ratios across the
list/detail screens) and resize down using PIL, e.g. for a main shot:
```python
from PIL import Image
im = Image.open("source.jpg").convert("RGB")
im.resize((640, int(im.height * 640 / im.width)), Image.LANCZOS).save(
    "assets/name.webp", "WEBP", quality=65, method=6
)
```

## Design source

Tokens were pixel-verified against the live app at `astro-bhagya-card.astrolokal.com`
(computed styles + the real logo asset's pixel colors), not guessed:
- Text `#35200F`, muted text `#8A6553`, background gradient recipe - sampled from the live page's computed CSS.
- CTA orange `#F45722`, gold `#FFBF6E`, panel tones - confirmed against both the original hex values given and the live app.
- Buttons: 16px radius (not pill), with the same soft colored glow shadow (`0 10px 22px -8px rgba(244,87,34,0.6)`) as the real "Talk to an Astrologer" button.
- List/detail layout (hero card, compact grid, trust pillars, sticky CTA with "all inclusive" caption, checkmark included-list, connected how-it-works timeline) was matched against reference mockups supplied directly, using our own verified color/font tokens rather than the mockups' own palette.

## Event capture (Postgres)

Every event captured by `window.track()` fire-and-forget POSTs to our own
`POST /api/events` (in `server.js`), **independent of the PostHog provider**
- both always fire. This is what actually satisfies "save it in a DB":

- Table `events` (auto-created on server boot if it doesn't exist): `id`, `user_id`, `event_name`, `page`, `page_name`, `recharge_count`, `variant`, `props` (jsonb, the full event payload), `created_at` (defaults to `now()`).
- Without `DATABASE_URL` set, the endpoint still returns 200 but just `console.info`s the event instead of writing a row - so local dev and the static-file preview server never break, they just don't persist anything.
- **To get real data flowing, `pooja-fakedoor` needs a `DATABASE_URL` secret in Devtron** - this is a change from the original deployment (which genuinely had no backend/DB). Follow the same DB-creation request you'd send C2S for any other app: `db_name`/`username` = `pooja_fakedoor` (or your project's naming convention), then wire the resulting connection string into a Devtron Secret and `envFrom` it into the workload, same pattern as `bhagya-card`.
- Once deployed with a real `DATABASE_URL` and getting traffic, pull the event sheet any time with `GET /api/events/export` - it streams a CSV (`id, user_id, event_name, page, page_name, recharge_count, variant, props, created_at`) you can open directly in Sheets/Excel. There's no data to export yet since this hasn't been deployed with a DB - I can't fabricate real captured events.
- The same Postgres instance also has a separate `waitlist` table (one row per gated `user_id`) - see "Waitlist gate" above for its schema and how to reset a specific user.

## Events tracked

All events go through a single `track(name, props, page)` wrapper (`analytics.js`)
that adds common props automatically: `user_id`, `recharge_count`, `variant`,
`timestamp`, plus `page`/`page_name` when a page constant is passed. Pages
(`window.PAGES` in `analytics.js`):

| Code | Name | Screen |
|---|---|---|
| `L1` | Listing Page | List screen |
| `L2` | Detail Page | Detail screen |
| `L3` | Waiting Page | Waitlist gate |

- `list_view` (L1)
- `pooja_card_click` `{pooja_id, price}` (L1)
- `back_click` `{back_action}` (L1/L2/L3 - fired on every header back button, wherever it is)
- `pooja_detail_view` `{pooja_id, price}` (L2)
- `astro_change_click` `{pooja_id}` (L2) - opens the "Change astrologer" bottom sheet
- `astro_confirm_click` `{pooja_id, astro_id, astro_name}` (L2) - confirms a new astrologer selection
- `pay_now_click` `{pooja_id, price}` (L2)
- `waitlist_gate_view` `{pooja_id}` (L3) - fired whenever the waitlist gate shows, both the first time (right after Pay Now) and on any later return visit
- `back_home_click` `{pooja_id}` (L3)
- `variant_missing` `{}` (L1) - fired when the `variant` param is missing/invalid (defaults to `a`)

`*_view` events are deduped per browser session (via `sessionStorage`) so a
refresh or back/forward navigation doesn't double-count a view.

Until a real PostHog key is set in `config.js` (`POSTHOG_KEY`), the PostHog
side falls back to `console.info` logging - the DB-capture POST to
`/api/events` always fires regardless, PostHog key or not.

## Screen behavior notes

- **S1 List → S2 Detail**: whole card is a tappable link (`#/pooja/:id`), pushes a new history entry.
- **S2 Detail → Pay Now**: shows a 3s loader overlay cycling astrologer-aware messages, saves the waitlist record, then navigates to `#/waitlist` using `history.replaceState`.
- **Waitlist gate → back button**: because `render()` intercepts every route once the waitlist record exists, back/forward navigation of any kind just keeps showing the waitlist gate - there's no route back into List or Detail.
- **Waitlist gate → Back to Home**: tries the WebView bridge first, falls back to `DEEPLINK_SCHEME` outside the app - see "Exiting back to the app" above.

## Testing done

Verified locally in 375×812 mobile viewport. `node`/`npm`/`pg` aren't
available in this dev sandbox, so anything that requires actually running
`server.js` (the Postgres-backed event capture and waitlist-gate writes/reads)
is code-reviewed carefully but **unverified pending a real Devtron deploy**
with `DATABASE_URL` set - test the full gate flow there before trusting it:
- Both pricing variants (`?variant=a` / `?variant=b`) show the correct price + MRP + discount % per pooja on List and Detail.
- Carousel: main shot (slide 1) is cropped/zoomed (`cover`, biased toward the top), item/samagri shot (slide 2) stretches to fill width (`fill`) - neither is cropped in a way that cuts off content, confirmed on both.
- No horizontal scroll.
- Full booking flow: List → Detail → Pay Now → loader → waitlist gate.
- Against the plain Python static server (no backend), `GET`/`POST /api/waitlist` fail as expected (404/501) and the app fails open (no gate) with zero console errors - confirms the frontend degrades safely without a backend, but does NOT confirm the gate itself works.
- Back-button routing verified: L1 back → exits to home (WebView bridge or deeplink fallback), L2 back → `#/list` (not home), L3 back → exits to home.
- All images (webp) load with 200 OK, no broken references; no console errors anywhere.
