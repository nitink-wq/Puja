/*
  Central config. Edit values here — nothing else should hardcode these.
*/
window.CONFIG = {
  // Fallback used only when the `home_deeplink` URL param is missing.
  // TODO(Nitin): replace with the real Astrolokal app home deeplink.
  HOME_DEEPLINK: "astrolokal://home",

  VALID_LTV_BANDS: ["unpaid", "ltv_0_200", "ltv_200_1000", "ltv_1000_plus"],
  DEFAULT_LTV_BAND: "unpaid",
  DEFAULT_PRICE_VARIANT: "base",

  // Fixed loader duration on Pay Now — cycles through the astrologer-aware
  // messages in copy.js over this window before showing Slots Full.
  LOADER_DURATION_MS: 3000,

  // Analytics
  ANALYTICS_PROVIDER: "posthog", // swap here to change provider globally
  POSTHOG_KEY: "PLACEHOLDER_POSTHOG_PROJECT_KEY", // TODO(Nitin): fill in
  POSTHOG_HOST: "https://app.posthog.com",
};
