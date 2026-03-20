/**
 * Gem Scouter — Scout Runner
 * Called by the GitHub Action every hour.
 * Fetches pinned items + auto-scouts all categories,
 * then saves results to data/listings.json in the repo.
 *
 * Run locally: node scripts/scout.js
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

// Your hand-picked listings — always included
const PINNED_IDS = [
  '336428618001',
  '177934183166',
  '205979855959',
  '177854314498',
  '166210081541',
  '326981617745',
  '306766486521',
  '306816032601',
];

const OUT_FILE = path.join(__dirname, 'listings.json');

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function normalisePinned(item) {
  const price = parseFloat(item.price?.value || 0);
  return {
    id: item.itemId,
    title: item.title,
    price,
    priceFormatted: `$${price.toFixed(2)}`,
    imageUrl: item.image?.imageUrl || null,
    affiliateUrl: item.itemAffiliateWebUrl || item.itemWebUrl,
    condition: item.condition || 'Pre-owned',
    source: 'eBay',
    category: detectCategory(item.title),
    tags: inferTags(item.title),
    pinned: true,
    authenticityScore: 80,
    matchLabel: 'Hand-picked',
    location: [item.itemLocation?.city, item.itemLocation?.stateOrProvince].filter(Boolean).join(', '),
    scoutedAt: new Date().toISOString(),
  };
}

function detectCategory(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('watch') || t.includes('wrist'))       return 'Watches & Timepieces';
  if (t.includes('ceramic') || t.includes('pottery'))   return 'Ceramics & Pottery';
  if (t.includes('painting') || t.includes('oil on'))   return 'Paintings & Original Art';
  if (t.includes('glasses') || t.includes('eyewear'))   return 'Eyewear';
  if (t.includes('brooch') || t.includes('necklace'))   return 'Jewelry & Accessories';
  return 'Vintage & Handmade';
}

function inferTags(title) {
  const t = (title || '').toLowerCase();
  const tags = ['vintage'];
  if (t.includes('watch'))         tags.push('watch');
  if (t.includes('art deco'))      tags.push('art deco');
  if (t.includes('gold'))          tags.push('gold');
  if (t.includes('sterling'))      tags.push('sterling');
  if (t.includes('mechanical'))    tags.push('mechanical');
  if (t.includes('handmade'))      tags.push('handmade');
  if (t.includes('cocktail'))      tags.push('cocktail');
  if (t.includes('leather'))       tags.push('leather');
  return [...new Set(tags)];
}

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('ERROR: Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET');
    console.error('  Local: create a .env file (see .env.example)');
    console.error('  GitHub: add them as repository secrets');
    process.exit(1);
  }

  log('Getting eBay OAuth token...');
  const token = await getToken(CLIENT_ID, CLIENT_SECRET);
  log('Token obtained ✓');

  // ── 1. Fetch pinned items ─────────────────────────────────
  log(`Fetching ${PINNED_IDS.length} pinned items...`);
  const pinnedResults = await Promise.allSettled(
    PINNED_IDS.map(id => getItem(id, token, CAMPAIGN_ID))
  );

  const pinned = pinnedResults
    .map((r, i) => {
      if (r.status === 'fulfilled' && r.value?.image?.imageUrl) {
        log(`  ✓ ${r.value.title?.substring(0, 55)}`);
        return normalisePinned(r.value);
      } else {
        log(`  ✗ Item ${PINNED_IDS[i]}: ${r.reason?.message || 'no image'}`);
        return null;
      }
    })
    .filter(Boolean);

  log(`Pinned: ${pinned.length}/${PINNED_IDS.length} fetched`);

  // ── 2. Scout all categories ───────────────────────────────
  log('\nRunning category scouts...');
  const scoutedByCategory = {};

  for (const query of QUERIES) {
    log(`  Scouting: ${query.label}`);
    try {
      const raw = await searchItems({
        token,
        query: query.query,
        categoryId: query.categoryId,
        priceMin: query.priceMin,
        priceMax: query.priceMax,
        conditions: query.conditions,
        limit: query.limit,
        campaignId: CAMPAIGN_ID,
      });

      const filtered = filterBatch(raw, query);
      scoutedByCategory[query.id] = filtered;
      log(`    ${raw.length} raw → ${filtered.length} passed filter`);

      // Small delay to be nice to the API
      await new Promise(r => setTimeout(r, 400));

    } catch (err) {
      log(`    ✗ Failed: ${err.message}`);
      scoutedByCategory[query.id] = [];
    }
  }

  const scouted = Object.values(scoutedByCategory).flat();
  log(`\nScouted total: ${scouted.length} items across ${QUERIES.length} categories`);

  // ── 3. Save to data/listings.json ────────────────────────
  const output = {
    scoutedAt: new Date().toISOString(),
    totalPinned: pinned.length,
    totalScouted: scouted.length,
    total: pinned.length + scouted.length,
    pinned,
    scouted,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
  log(`\n✓ Saved ${OUT_FILE}`);
  log(`  ${pinned.length} pinned + ${scouted.length} scouted = ${output.total} total gems`);
}

main().catch(err => {
  console.error('Scout failed:', err);
  process.exit(1);
});
