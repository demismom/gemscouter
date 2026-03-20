/**
 * Gem Scouter — Filter & Scoring Engine
 * Scores each listing 0–100 for likely authenticity
 */

function filterAndScore(item, query) {
  const title = (item.title || '').toLowerCase();
  const price  = parseFloat(item.price?.value || 0);
  const feedbackPct = parseFloat(item.seller?.feedbackPercentage || 100);

  // ── Hard filters ──────────────────────────────────────────
  if (!item.image?.imageUrl) return null;
  if (!price) return null;
  if (feedbackPct < 95) return null;

  // Exclude disqualifying keywords
  if (query.exclude?.some(w => title.includes(w.toLowerCase()))) return null;

  // Must match at least one authenticity keyword
  if (query.requireOneOf?.length) {
    if (!query.requireOneOf.some(w => title.includes(w.toLowerCase()))) return null;
  }

  // Price range
  if (query.priceMin && price < query.priceMin) return null;
  if (query.priceMax && price > query.priceMax) return null;

  // ── Authenticity score ────────────────────────────────────
  let score = 50;

  const boosts = [
    { words: ['signed', 'artist signed'],                    pts: 15 },
    { words: ['original', 'one of a kind', 'unique'],        pts: 12 },
    { words: ['handmade', 'hand made', 'hand thrown'],        pts: 12 },
    { words: ['vintage', 'antique', 'mid century', 'deco'],  pts: 10 },
    { words: ['studio', 'studio pottery'],                   pts: 10 },
    { words: ['mechanical', 'automatic', 'hand wind'],        pts: 10 },
    { words: ['swiss', 'swiss made'],                        pts:  8 },
    { words: ['folk art', 'folk'],                           pts:  8 },
    { words: ['oil on canvas', 'oil on board'],              pts: 12 },
    { words: ['stoneware', 'earthenware', 'raku'],           pts: 10 },
    { words: ['sterling', 'filigree', 'enamel'],             pts:  8 },
  ];

  for (const b of boosts) {
    if (b.words.some(w => title.includes(w))) score += b.pts;
  }

  const penalties = [
    { words: ['lot of', 'set of'],   pts: -10 },
    { words: ['as is', 'for parts'], pts: -15 },
  ];

  for (const p of penalties) {
    if (p.words.some(w => title.includes(w))) score += p.pts;
  }

  if (feedbackPct >= 99.5) score += 5;
  score = Math.min(100, Math.max(0, score));

  // ── Build clean listing object ────────────────────────────
  return {
    id: item.itemId,
    title: item.title,
    price,
    priceFormatted: `$${price.toFixed(2)}`,
    imageUrl: item.image.imageUrl,
    affiliateUrl: item.itemAffiliateWebUrl || item.itemWebUrl,
    condition: item.condition || 'Pre-owned',
    source: 'eBay',
    category: query.label,
    categoryId: query.id,
    categoryIcon: query.icon,
    tags: query.tags || [],
    authenticityScore: score,
    matchLabel: score >= 85 ? 'Strong match' : score >= 70 ? 'Good match' : 'Explore',
    location: item.itemLocation?.city || '',
    pinned: false,
    scoutedAt: new Date().toISOString(),
  };
}

function filterBatch(items, query) {
  return items
    .map(i => filterAndScore(i, query))
    .filter(Boolean)
    .sort((a, b) => b.authenticityScore - a.authenticityScore);
}

module.exports = { filterBatch };
