/*
  Central config. Edit values here - nothing else should hardcode these.
*/
window.CONFIG = {
  // Fixed loader duration on Pay Now - cycles through the astrologer-aware
  // messages in copy.js over this window before showing Slots Full.
  LOADER_DURATION_MS: 3000,

  // Analytics
  ANALYTICS_PROVIDER: "posthog", // swap here to change provider globally
  POSTHOG_KEY: "PLACEHOLDER_POSTHOG_PROJECT_KEY", // TODO(Nitin): fill in
  POSTHOG_HOST: "https://app.posthog.com",
};
