# Pooja Fake-Door Test

Mobile-first mweb page for testing whether users click into and try to pay for
poojas. No real payments, no payment fields, no backend except event tracking
(PostHog).

Vanilla HTML/CSS/JS, no build step, static deploy. Hash routing: `#/list`,
`#/pooja/:id`, `#/full/:id`.

## Run locally

```
cd pooja-fakedoor
python3 -m http.server 8123
```

Open `http://localhost:8123/?user_token=demo123`.

## URL params

| Param | Values | Notes |
|---|---|---|
| `user_token` | any string | Passed through untouched (not decoded) into every tracked event, and used as the key for the waitlist banner (see below). |
| `home_deeplink` | a URL/deeplink string | Where "Back to Home" navigates. Falls back to `CONFIG.HOME_DEEPLINK` in `config.js` if absent — **currently a placeholder (`astrolokal://home`), fill in the real value before shipping**. |
| `ltv_band`, `price_variant` | same values as before | Still parsed and still attached to every analytics event, but **no longer affect the price shown** — see Pricing below. Kept so you still have the dimension available for analysis. |

### Example URL

```
http://localhost:8123/?user_token=USER123&home_deeplink=astrolokal://home
```

Deep-linking straight to a pooja also works, e.g.:
```
http://localhost:8123/?user_token=USER123#/pooja/kaal-sarp-dosh-nivaran
```

## Pricing (flat, not band-driven)

Per Nitin's request this replaced the original ltv_band price ladder:

- The pooja marked `recommended: true` in `poojas.js` (currently Kaal Sarp Dosh Nivaran) is priced at **₹750** (was ₹1500, 50% off) and becomes the featured hero card.
- Every other pooja is priced at **₹500** (was ₹1020, 51% off).

Change the numbers in `pricing.js` (`RECOMMENDED_PRICE`, `RECOMMENDED_COMPARE_AT`,
`STANDARD_PRICE`, `STANDARD_COMPARE_AT`). To make a different pooja the featured
one, move the `recommended: true` flag to it in `poojas.js` — nothing else
needs to change. To bring back per-band pricing later, reintroduce a lookup
keyed on `window.PARAMS.ltv_band` inside `getPrice`/`getCompareAtPrice` in
`pricing.js` — no other file needs to change.

## Waitlist banner (return-visit nudge)

The goal: once someone has tried to book (reached the "all slots full" screen),
don't invite them to keep retrying every time they come back.

- The moment a user lands on Slots Full, a record `{userToken, poojaId, poojaName, submittedAt}` is saved to `localStorage` (`pooja_fakedoor_waitlist_v1`).
- On any later visit to the List page **with the same `user_token`**, a banner appears above the hero card: *"You're on the list! All our astrologers are busy right now. We'll notify you the moment someone is free for {pooja name}."*
- Different `user_token` values are isolated from each other (verified in-browser — switching the token hides the banner).
- This is client-side only (no backend), so it only persists on the same device/browser. Clear the banner during testing with `localStorage.removeItem('pooja_fakedoor_waitlist_v1')` in devtools.
- Fires a `waitlist_banner_view` event (deduped once per browser session, same as other `*_view` events) — see Events below.

## Where to change things

- **Prices**: `pricing.js` — see Pricing section above.
- **Pooja copy/content**: `poojas.js` — one object per pooja (what it does, duration, mode, what's included, rating, users booked, tag). Language is kept plain/simple for tier-2/3 city readers — specific to the ritual, not generic filler, and light on heavy Sanskrit/astrology jargon. Max 5 poojas.
- **Screen copy** (headers, trust line, waitlist banner, loader text, slots-full message): `copy.js`.
- **Home deeplink fallback / PostHog key / placeholder astrologer**: `config.js`. Astrologer `rating: 4.9` is a placeholder number, flagged in a comment — replace with real data when available.
- **Pooja images**: `pooja-art.js` — `window.POOJA_ART[id]` is an array of image URLs per pooja (first one doubles as the list-card thumbnail). All 5 poojas currently have 2 real photos each (main ritual shot + samagri/ingredients infographic). Add a 3rd or swap in new photography any time — just edit the array, no other code changes.
- **Logo / astrologer photo**: `assets/astrolokal-logo.png` (from the real app, resized to 120×120) and `assets/astrologer-placeholder.webp` (reused from the `ai-pooja` project's `pandit.jpg`).
- **Design tokens** (colors, fonts, radii, shadows, spacing, background gradient, type scale): `tokens.css`. Do not add new colors/fonts/component styles outside this file — `styles.css` only consumes tokens.
- **Analytics provider**: `CONFIG.ANALYTICS_PROVIDER` in `config.js` (currently `posthog`). Add a new adapter function in the `PROVIDERS` object in `analytics.js` to swap providers.

## Image optimization (slow 3G)

All real photos are WebP, resized to 640px wide (2x-retina-sharp for their max
display size, no larger) and compressed to quality 60 — this cut total asset
weight from ~1.5MB to ~500KB (10 pooja photos average ~44KB each, down from
~140KB JPEGs). The astrologer photo and logo were similarly downsized. The
first/above-the-fold image on each screen (hero card, first carousel slide)
loads eagerly with `fetchpriority="high"`; everything else below the fold uses
`loading="lazy"`. All `<img>` tags carry `width`/`height` to avoid layout shift.

If you add new photography, resize to ~640–720px wide and export as WebP
quality ~60–68 before dropping it into `assets/` — a rough script:
```python
from PIL import Image
im = Image.open("source.jpg").convert("RGB")
im.resize((640, int(im.height * 640 / im.width)), Image.LANCZOS).save(
    "assets/name.webp", "WEBP", quality=60, method=6
)
```

## Design source

Tokens were pixel-verified against the live app at `astro-bhagya-card.astrolokal.com`
(computed styles + the real logo asset's pixel colors), not guessed:
- Text `#35200F`, muted text `#8A6553`, background gradient recipe — sampled from the live page's computed CSS.
- CTA orange `#F45722`, gold `#FFBF6E`, panel tones — confirmed against both the original hex values given and the live app.
- Buttons: 16px radius (not pill), with the same soft colored glow shadow (`0 10px 22px -8px rgba(244,87,34,0.6)`) as the real "Talk to an Astrologer" button.
- List/detail layout (hero card, compact grid, trust pillars, sticky CTA with "all inclusive" caption, checkmark included-list, connected how-it-works timeline) was matched against reference mockups supplied directly, using our own verified color/font tokens rather than the mockups' own palette.

## Events tracked

All events go through a single `track(name, props)` wrapper (`analytics.js`) that
adds common props automatically: `user_token`, `ltv_band`, `price_variant`, `timestamp`.

- `list_view`
- `waitlist_banner_view` `{pooja_id}` — fired when the return-visit waitlist banner is shown
- `pooja_card_click` `{pooja_id, price}`
- `pooja_detail_view` `{pooja_id, price}`
- `pay_now_click` `{pooja_id, price}`
- `slots_full_view` `{pooja_id, price}`
- `back_home_click` `{pooja_id, price}`
- `ltv_band_missing` `{}` — fired when `ltv_band` param is missing/invalid

`*_view` events are deduped per browser session (via `sessionStorage`) so a
refresh or back/forward navigation doesn't double-count a view.

Until a real PostHog key is set in `config.js` (`POSTHOG_KEY`), all events
fall back to `console.info` logging so you can verify tracking locally without
a live project.

## Screen behavior notes

- **S1 List → S2 Detail**: whole card is a tappable link (`#/pooja/:id`), pushes a new history entry.
- **S2 Detail → Pay Now**: shows a 1.2–1.8s loader overlay (random duration, no route change), saves the waitlist record, then navigates to `#/full/:id` using `history.replaceState` — this replaces the Detail entry in history.
- **S4 Slots Full → back button**: because Detail was replaced (not pushed) when transitioning to Full, browser/hardware back from S4 goes straight to S1 (List), never back into the loader or Detail. Verified in-browser.
- **S4 → Back to Home**: navigates to `home_deeplink` (or the `CONFIG.HOME_DEEPLINK` fallback).

## Testing done

Verified locally in 375×812 and 360×800 mobile viewports:
- ₹750 recommended / ₹500 standard pricing shown correctly on List and Detail.
- No horizontal scroll at either viewport size (`scrollWidth === clientWidth`).
- Full booking flow: List → Detail → Pay Now → loader → Slots Full → Back to Home.
- Back-button from Slots Full lands on List, not the loader/Detail.
- Waitlist banner appears on return visits with the correct pooja name, and is correctly isolated per `user_token` (verified by switching tokens).
- All images (webp) load with 200 OK, no broken references; no console errors anywhere.
