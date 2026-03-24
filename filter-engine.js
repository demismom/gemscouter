/**
 * Gem Scouter — Filter & Scoring Engine
 * Scores each listing 0-100 for likely authenticity
 * trusted: true queries skip feedback filter but still require vintage/vtg
 */

var VINTAGE_WORDS = ['vintage', 'vtg'];

function filterAndScore(item, query) {
  var title = (item.title || '').toLowerCase();
  var price = parseFloat((item.price && item.price.value) ? item.price.value : 0);
  var feedbackPct = parseFloat((item.seller && item.seller.feedbackPercentage) ? item.seller.feedbackPercentage : 100);
  var imageUrl = item.image && item.image.imageUrl ? item.image.imageUrl : null;
  var location = item.itemLocation && item.itemLocation.city ? item.itemLocation.city : '';

  // ── Hard filters ──────────────────────────────────────────
  if (!imageUrl) return null;
  if (!price) return null;

  // Feedback filter — skip for trusted sellers
  if (!query.trusted && feedbackPct < 95) return null;

  // Exclude disqualifying keywords (always applied)
  if (query.exclude && query.exclude.some(function(w) { return title.includes(w.toLowerCase()); })) return null;

  // Require vintage/vtg for all queries — broad and trusted
  if (!VINTAGE_WORDS.some(function(w) { return title.includes(w); })) return null;

  // Additional keyword filter for broad (non-trusted) scouts
  if (!query.trusted && query.requireOneOf && query.requireOneOf.length) {
    if (!query.requireOneOf.some(function(w) { return title.includes(w.toLowerCase()); })) return null;
  }

  // Price range
  if (query.priceMin && price < query.priceMin) return null;
  if (query.priceMax && price > query.priceMax) return null;

  // ── Authenticity score ────────────────────────────────────
  var score = query.trusted ? 70 : 50;

  var boosts = [
    { words: ['signed', 'artist signed'],                    pts: 15 },
    { words: ['original', 'one of a kind', 'unique'],        pts: 12 },
    { words: ['handmade', 'hand made', 'hand thrown'],       pts: 12 },
    { words: ['vintage', 'antique', 'mid century', 'deco'],  pts: 10 },
    { words: ['studio', 'studio pottery'],                   pts: 10 },
    { words: ['mechanical', 'automatic', 'hand wind'],       pts: 10 },
    { words: ['swiss', 'swiss made'],                        pts:  8 },
    { words: ['folk art', 'folk'],                           pts:  8 },
    { words: ['oil on canvas', 'oil on board'],              pts: 12 },
    { words: ['stoneware', 'earthenware', 'raku'],           pts: 10 },
    { words: ['sterling', 'filigree', 'enamel'],             pts:  8 },
  ];

  for (var i = 0; i < boosts.length; i++) {
    if (boosts[i].words.some(function(w) { return title.includes(w); })) score += boosts[i].pts;
  }

  var penalties = [
    { words: ['lot of', 'set of'],   pts: -10 },
    { words: ['as is', 'for parts'], pts: -15 },
  ];

  for (var j = 0; j < penalties.length; j++) {
    if (penalties[j].words.some(function(w) { return title.includes(w); })) score += penalties[j].pts;
  }

  if (feedbackPct >= 99.5) score += 5;
  score = Math.min(100, Math.max(0, score));

  // ── Build clean listing object ────────────────────────────
  return {
    id: item.itemId,
    title: item.title,
    price: price,
    priceFormatted: '$' + price.toFixed(2),
    imageUrl: imageUrl,
    affiliateUrl: item.itemAffiliateWebUrl || item.itemWebUrl,
    condition: item.condition || 'Pre-owned',
    source: 'eBay',
    category: query.label.split(' —')[0].trim(),
    categoryId: query.id,
    categoryIcon: query.icon,
    tags: query.tags || [],
    authenticityScore: score,
    trusted: query.trusted || false,
    matchLabel: score >= 85 ? 'Strong match' : score >= 70 ? 'Good match' : 'Explore',
    location: location,
    pinned: false,
    scoutedAt: new Date().toISOString(),
  };
}

function filterBatch(items, query) {
  var results = items
    .map(function(i) { return filterAndScore(i, query); })
    .filter(Boolean)
    .sort(function(a, b) { return b.authenticityScore - a.authenticityScore; });

  // For broad scouts, trim to keepTop
  if (!query.trusted && query.keepTop) {
    return results.slice(0, query.keepTop);
  }
  return results;
}

module.exports = { filterBatch };
