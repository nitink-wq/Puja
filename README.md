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

Frontend only (no event capture, no DB - events just log to console via the
provider fallback):
```
cd pooja-fakedoor
python3 -m http.server 8123
```
Open `http://localhost:8123/?user_id=demo123&variant=a`.

Full stack, including the event-capture API (`node` + `pg` required):
```
cd pooja-fakedoor
npm install
DATABASE_URL=postgres://... node server.js
```
Without `DATABASE_URL` set, `node server.js` still runs fine - POST
`/api/events` just logs to console instead of writing to Postgres.

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

- The moment the Pay Now loader finishes, a record `{userId, poojaId, poojaName, submittedAt}` is saved to `localStorage` (`pooja_fakedoor_waitlist_v1`), and the waitlist screen shows immediately.
- From then on, **every route** - `#/list`, `#/pooja/:id`, a fresh page load, any future visit - is intercepted by `render()` in `app.js` before the normal router even runs, and shows the same waitlist screen instead. There is no way back into the List or Detail screens for that `user_id` once the record exists.
- Different `user_id` values are fully isolated from each other (verified in-browser - switching the id restores normal access).
- The gate itself is client-side only (`localStorage`), so it only persists on the same device/browser regardless of the DB event capture below. Clear it during testing with `localStorage.removeItem('pooja_fakedoor_waitlist_v1')` in devtools.
- Fires a `waitlist_gate_view` event (deduped once per browser session, same as other `*_view` events) - see Events below.
- "Back to Home" on the waitlist screen still works (leaves the app entirely - see "Exiting back to the app" below).

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

Verified locally in 375×812 mobile viewport (frontend only - `node`/`pg`
aren't available in this dev sandbox, so the `/api/events` DB write path
itself is unverified pending a real Devtron deploy with `DATABASE_URL` set):
- Both pricing variants (`?variant=a` / `?variant=b`) show the correct price per pooja on List and Detail, no discount badge shown.
- Carousel images (both main and item/samagri shots) display uncropped, letterboxed on `--color-card` where the aspect ratio doesn't match.
- No horizontal scroll.
- Full booking flow: List → Detail → Pay Now → loader → waitlist gate.
- Once the waitlist record exists, every route (list, detail, fresh load) shows the gate - confirmed booking is fully blocked, not just banner-nudged.
- Different `user_id` values are isolated (verified by switching ids).
- All images (webp) load with 200 OK, no broken references; no console errors anywhere.
