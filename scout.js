/**
 * Gem Scouter — Scout Runner
 *
 * Sources:
 * 1. Google Sheet (Fashionphile + other affiliate links)
 * 2. eBay collection (hand-picked)
 * 3. eBay API scout (4 categories, 100 each)
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
const SHEET_CSV_URL  = 'https://docs.google.com/spreadsheets/d/1R0PmBS_kJsgU8uvewGm8JHzLphEcUHwDQWraSAOwiFY/export?format=csv&gid=938314832';

const FALLBACK_PINNED_IDS = [
  '336428618001','177934183166','205979855959','177854314498',
  '166210081541','326981617745','306766486521','306816032601',
];

const OUT_FILE = path.join(__dirname, '../listings.json');

function log(msg) { console.log('[' + new Date().toISOString() + '] ' + msg); }

// ── 1. Fetch Google Sheet listings ───────────────────────
async function fetchSheetListings() {
  log('Fetching Google Sheet affiliate links...');
  try {
    const res = await fetch(SHEET_CSV_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const csv = await res.text();
    const lines = csv.split('\n').filter(Boolean);

    // Skip header row
    const items = [];
    for (var i = 1; i < lines.length; i++) {
      // Parse CSV row (handle quoted fields)
      const cols = parseCSVRow(lines[i]);
      // Columns: ID, Title, AffiliateURL, Program, Category, Tags, Price, Status, Notes, ImageURL
      const id           = (cols[0] || '').trim();
      const title        = (cols[1] || '').trim();
      const affiliateUrl = (cols[2] || '').trim();
      const program      = (cols[3] || '').trim();
      const category     = (cols[4] || '').trim();
      const tags         = (cols[5] || '').trim();
      const priceRaw     = (cols[6] || '').trim();
      const status       = (cols[7] || '').trim().toLowerCase();
      // col[8] = Notes (skip)
      const imageUrl     = (cols[9] || '').trim();

      // Only include active items with required fields
      if (!title || !affiliateUrl || status !== 'active') continue;

      const price = parseFloat(priceRaw.replace(/[^0-9.]/g, '')) || 0;

      items.push({
        id: id || 'sheet-' + i,
        title: title,
        price: price,
        priceFormatted: price ? '$' + price.toFixed(2) : '',
        imageUrl: imageUrl || null,
        affiliateUrl: affiliateUrl,
        condition: 'Pre-owned',
        source: program || 'Affiliate',
        category: category || 'Jewelry & Accessories',
        tags: tags ? tags.split(',').map(function(t) { return t.trim(); }) : [],
        pinned: true,
        matchLabel: 'Hand-picked',
        scoutedAt: new Date().toISOString(),
      });
    }

    log('  Found ' + items.length + ' active sheet listings');
    return items;
  } catch (err) {
    log('  Sheet fetch failed: ' + err.message);
    return [];
  }
}

function parseCSVRow(row) {
  var cols = [];
  var current = '';
  var inQuotes = false;
  for (var i = 0; i < row.length; i++) {
    var c = row[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      cols.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  cols.push(current);
  return cols;
}

// ── 2. Fetch eBay collection ──────────────────────────────
async function fetchCollectionIds() {
  log('Fetching eBay collection...');
  try {
    const res = await fetch(COLLECTION_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const html = await res.text();
    const ids = [];
    const pattern = /\/itm\/(\d{12,13})/g;
    var match;
    while ((match = pattern.exec(html)) !== null) {
      if (!ids.includes(match[1])) ids.push(match[1]);
    }
    if (!ids.length) throw new Error('No IDs found');
    log('  Found ' + ids.length + ' items in collection');
    return ids;
  } catch (err) {
    log('  Collection fetch failed: ' + err.message + ' — using fallback');
    return FALLBACK_PINNED_IDS;
  }
}

function detectCategory(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('watch') || t.includes('wrist'))         return 'Watches & Timepieces';
  if (t.includes('glasses') || t.includes('frames') || t.includes('sunglasses') || t.includes('eyewear') || t.includes('spectacles') || t.includes('optical')) return 'Eyewear & Sunglasses';
  if (t.includes('painting') || t.includes('oil on') || t.includes('canvas') || t.includes('watercolor')) return 'Paintings & Original Art';
  if (t.includes('brooch') || t.includes('necklace') || t.includes('bracelet') || t.includes('ring') || t.includes('earring')) return 'Jewelry & Accessories';
  return 'Jewelry & Accessories';
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
  if (t.includes('gucci'))      tags.push('gucci');
  if (t.includes('chanel'))     tags.push('chanel');
  if (t.includes('hermes'))     tags.push('hermes');
  if (t.includes('burberry'))   tags.push('burberry');
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

  // ── Source 1: Google Sheet ────────────────────────────
  const sheetListings = await fetchSheetListings();

  // ── Source 2: eBay collection ─────────────────────────
  log('Getting eBay OAuth token...');
  const token = await getToken(CLIENT_ID, CLIENT_SECRET);
  log('Token obtained ✓');

  const pinnedIds = await fetchCollectionIds();
  log('Fetching ' + pinnedIds.length + ' pinned items from API...');

  const pinnedResults = await Promise.allSettled(
    pinnedIds.map(function(id) { return getItem(id, token, CAMPAIGN_ID); })
  );

  const ebayPinned = pinnedResults.map(function(r, i) {
    if (r.status === 'fulfilled' && r.value && r.value.image && r.value.image.imageUrl) {
      log('  ✓ ' + (r.value.title || '').substring(0, 55));
      return normalise(r.value, true);
    }
    log('  ✗ Item ' + pinnedIds[i] + ': ' + (r.reason && r.reason.message ? r.reason.message : 'no image'));
    return null;
  }).filter(Boolean);

  log('eBay pinned: ' + ebayPinned.length + '/' + pinnedIds.length + ' fetched ✓');

  // Merge all pinned — sheet first, then eBay collection
  const allPinned = sheetListings.concat(ebayPinned);
  log('Total pinned: ' + allPinned.length + ' (' + sheetListings.length + ' sheet + ' + ebayPinned.length + ' eBay)');

  // ── Source 3: eBay scout ──────────────────────────────
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
      log('    ' + raw.length + ' raw → ' + filtered.length + ' passed filter');
      await new Promise(function(r) { setTimeout(r, 400); });
    } catch (err) {
      log('    ✗ Failed: ' + err.message);
    }
  }

  // ── Save listings.json ────────────────────────────────
  const output = {
    scoutedAt: new Date().toISOString(),
    totalPinned: allPinned.length,
    totalScouted: scouted.length,
    total: allPinned.length + scouted.length,
    pinned: allPinned,
    scouted: scouted,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
  log('\n✓ Done — ' + allPinned.length + ' pinned + ' + scouted.length + ' scouted = ' + output.total + ' total gems');
  log('  Sheet: ' + sheetListings.length + ' | eBay collection: ' + ebayPinned.length + ' | Scouted: ' + scouted.length);
}

main().catch(function(err) {
  console.error('Scout failed:', err);
  process.exit(1);
});
