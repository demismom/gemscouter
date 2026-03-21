/**
 * Gem Scouter — Scout Runner
 *
 * Automatically fetches pinned items from your eBay collection,
 * plus scouts all 4 categories up to 100 results each.
 *
 * Run locally: node scripts/scout.js
 * In GitHub Actions: runs automatically every hour
 *
 * TO ADD HAND-PICKED ITEMS: just save them to your eBay collection at
 * https://www.ebay.com/inf/gemscouter/collections/101331828749
 * They will appear on the site within an hour automatically.
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { getToken, getItem, searchItems } = require('./ebay-client');
const { filterBatch } = require('./filter-engine');
const QUERIES = require('./scout-queries');

const CLIENT_ID     = process.env.EBAY_CLIENT_ID;
const CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;
const CAMPAIGN_ID   = process.env.EBAY_CAMPAIGN_ID || '5339145706';

const COLLECTION_URL = 'https://www.ebay.com/inf/gemscouter/collections/101331828749';

const FALLBACK_PINNED_IDS = [
  '336428618001','177934183166','205979855959','177854314498',
  '166210081541','326981617745','306766486521','306816032601',
];

const OUT_FILE = path.join(__dirname, '../listings.json');

function log(msg) { console.log('[' + new Date().toISOString() + '] ' + msg); }

async function fetchCollectionIds() {
  log('Fetching eBay collection for hand-picked items...');
  try {
    const res = await fetch(COLLECTION_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const html = await res.text();
    const ids = [];
    const pattern = /\/itm\/(\d{12,13})/g;
    let match;
    while ((match = pattern.exec(html)) !== null) {
      if (!ids.includes(match[1])) ids.push(match[1]);
    }
    if (!ids.length) throw new Error('No item IDs found');
    log('  Found ' + ids.length + ' items in collection');
    return ids;
  } catch (err) {
    log('  Collection fetch failed: ' + err.message + ' — using fallback IDs');
    return FALLBACK_PINNED_IDS;
  }
}

function detectCategory(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('watch') || t.includes('wrist'))         return 'Watches & Timepieces';
  if (t.includes('glasses') || t.includes('frames') || t.includes('sunglasses') || t.includes('eyewear')) return 'Eyewear & Sunglasses';
  if (t.includes('painting') || t.includes('oil on') || t.includes('canvas') || t.includes('watercolor'))  return 'Paintings & Original Art';
  if (t.includes('brooch') || t.includes('necklace') || t.includes('bracelet') || t.includes('ring') || t.includes('earring')) return 'Jewelry & Accessories';
  return 'Vintage & Handmade';
}

function inferTags(title) {
  const t = (title || '').toLowerCase();
  const tags = ['vintage'];
  if (t.includes('watch'))      tags.push('watch');
  if (t.includes('art deco'))   tags.push('art deco');
  if (t.includes('gold'))       tags.push('gold');
  if (t.includes('sterling'))   tags.push('sterling');
  if (t.includes('mechanical')) tags.push('mechanical');
  if (t.includes('handmade'))   tags.push('handmade');
  if (t.includes('signed'))     tags.push('signed');
  if (t.includes('oil'))        tags.push('oil painting');
  if (t.includes('folk'))       tags.push('folk art');
  return [...new Set(tags)];
}

function normalise(item, pinned) {
  const price = parseFloat(item.price && item.price.value ? item.price.value : 0);
  return {
    id: item.itemId,
    title: item.title,
    price: price,
    priceFormatted: '$' + price.toFixed(2),
    imageUrl: item.image && item.image.imageUrl ? item.image.imageUrl : null,
    affiliateUrl: item.itemAffiliateWebUrl || item.itemWebUrl,
    condition: item.condition || 'Pre-owned',
    source: 'eBay',
    category: detectCategory(item.title),
    tags: inferTags(item.title),
    pinned: pinned,
    matchLabel: pinned ? 'Hand-picked' : 'Scouted',
    location: [item.itemLocation && item.itemLocation.city, item.itemLocation && item.itemLocation.stateOrProvince].filter(Boolean).join(', '),
    scoutedAt: new Date().toISOString(),
  };
}

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('ERROR: Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET');
    process.exit(1);
  }

  log('Getting eBay OAuth token...');
  const token = await getToken(CLIENT_ID, CLIENT_SECRET);
  log('Token obtained ✓');

  // ── 1. Fetch collection IDs then get full item details ────
  const pinnedIds = await fetchCollectionIds();
  log('Fetching ' + pinnedIds.length + ' pinned items from API...');

  const pinnedResults = await Promise.allSettled(
    pinnedIds.map(function(id) { return getItem(id, token, CAMPAIGN_ID); })
  );

  const pinned = pinnedResults.map(function(r, i) {
    if (r.status === 'fulfilled' && r.value && r.value.image && r.value.image.imageUrl) {
      log('  ✓ ' + (r.value.title || '').substring(0, 55));
      return normalise(r.value, true);
    } else {
      log('  ✗ Item ' + pinnedIds[i] + ': ' + (r.reason && r.reason.message ? r.reason.message : 'no image'));
      return null;
    }
  }).filter(Boolean);

  log('Pinned: ' + pinned.length + '/' + pinnedIds.length + ' fetched ✓');

  // ── 2. Scout all 4 categories at 100 each ────────────────
  log('\nRunning category scouts...');
  const scouted = [];

  for (var i = 0; i < QUERIES.length; i++) {
    var query = QUERIES[i];
    log('  Scouting: ' + query.label + ' (max ' + query.limit + ')');
    try {
      const raw = await searchItems({
        token: token,
        query: query.query,
        categoryId: query.categoryId,
        priceMin: query.priceMin,
        priceMax: query.priceMax,
        conditions: query.conditions,
        limit: query.limit,
        campaignId: CAMPAIGN_ID,
      });
      const filtered = filterBatch(raw, query);
      for (var j = 0; j < filtered.length; j++) scouted.push(filtered[j]);
      log('    ' + raw.length + ' raw \u2192 ' + filtered.length + ' passed filter');
      await new Promise(function(r) { setTimeout(r, 400); });
    } catch (err) {
      log('    \u2717 Failed: ' + err.message);
    }
  }

  // ── 3. Write listings.json ────────────────────────────────
  const output = {
    scoutedAt: new Date().toISOString(),
    totalPinned: pinned.length,
    totalScouted: scouted.length,
    total: pinned.length + scouted.length,
    pinned: pinned,
    scouted: scouted,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
  log('\n\u2713 Done \u2014 ' + pinned.length + ' pinned + ' + scouted.length + ' scouted = ' + output.total + ' total gems');
  log('  Saved to ' + OUT_FILE);
  log('\nTo add hand-picked items: save listings to your eBay collection at:');
  log('  ' + COLLECTION_URL);
}

main().catch(function(err) {
  console.error('Scout failed:', err);
  process.exit(1);
});
