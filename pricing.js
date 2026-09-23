/*
  Real pricing driven by the `variant` URL param (a or b) - see Nitin's spec.
  Every pooja has its own explicit price per variant (PRICE_TABLE). The MRP
  (compare-at) shown with a strikethrough is derived from that price using a
  fixed discount % per pooja tier - same 50%/51% split as the original flat
  pricing model, so the actual displayed price never changes, only what's
  shown alongside it. This keeps the MRP/discount consistent per Nitin's
  request ("keep the discount % same, write the MRP") rather than us
  inventing an unrelated MRP number.
*/
window.PRICE_TABLE = {
  a: {
    "grah-dosh-nivaran": 500,
    "buri-nazar-nivaran": 500,
    "navgrah-shanti": 500,
    "kaal-sarp-dosh-nivaran": 500,
    "prem-milan": 750,
  },
  b: {
    "grah-dosh-nivaran": 1500,
    "buri-nazar-nivaran": 1500,
    "navgrah-shanti": 1500,
    "kaal-sarp-dosh-nivaran": 1500,
    "prem-milan": 2100,
  },
};
window.DEFAULT_VARIANT = "a";

// Same split as the original flat-pricing model: the featured/recommended
// pooja is 50% off, every other pooja is 51% off - regardless of variant.
window.DISCOUNT_PERCENT = {
  recommended: 50,
  standard: 51,
};

window.getVariant = function getVariant() {
  var v = window.PARAMS && window.PARAMS.variant;
  return v === "b" ? "b" : window.DEFAULT_VARIANT;
};

window.getPrice = function getPrice(pooja) {
  if (!pooja) return 0;
  var table = window.PRICE_TABLE[window.getVariant()];
  return table && table[pooja.id] != null ? table[pooja.id] : 0;
};

window.getDiscountPercent = function getDiscountPercent(pooja) {
  return pooja && pooja.recommended ? window.DISCOUNT_PERCENT.recommended : window.DISCOUNT_PERCENT.standard;
};

window.getCompareAtPrice = function getCompareAtPrice(pooja) {
  var price = window.getPrice(pooja);
  var discount = window.getDiscountPercent(pooja);
  return Math.round(price / (1 - discount / 100));
};
