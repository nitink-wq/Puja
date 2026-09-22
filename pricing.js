/*
  Flat pricing: the recommended (top) pooja is priced differently from the rest.
  Per Nitin's instruction this replaced the earlier ltv_band-driven price ladder —
  price no longer varies by `ltv_band`. The `ltv_band`/`price_variant` URL params
  are still parsed and still attached to every analytics event (see analytics.js),
  so that dimension is still available for analysis even though it no longer
  changes what price is shown. To bring back per-band pricing later, reintroduce
  a lookup keyed on window.PARAMS.ltv_band here — no other file needs to change.
*/
window.RECOMMENDED_PRICE = 750;
window.RECOMMENDED_COMPARE_AT = 1500; // 50% off
window.STANDARD_PRICE = 500;
window.STANDARD_COMPARE_AT = 1020; // 51% off

window.getPrice = function getPrice(pooja) {
  return pooja && pooja.recommended ? window.RECOMMENDED_PRICE : window.STANDARD_PRICE;
};

window.getCompareAtPrice = function getCompareAtPrice(pooja) {
  return pooja && pooja.recommended ? window.RECOMMENDED_COMPARE_AT : window.STANDARD_COMPARE_AT;
};

window.getDiscountPercent = function getDiscountPercent(pooja) {
  const price = window.getPrice(pooja);
  const compareAt = window.getCompareAtPrice(pooja);
  return Math.round(100 - (100 * price) / compareAt);
};
