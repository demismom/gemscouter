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

// ── eBay collections (public URLs from the account you curate on) ──
// Paste your new collection URL(s) here, e.g. 'https://www.ebay.com/inf/USERNAME/collections/123456789'
const COLLECTION_URLS = [
  // 'https://www.ebay.com/inf/NEWUSERNAME/collections/XXXXXXXXXXX',
];

// Optional: a separate collection whose items all go under the Home department
const HOME_COLLECTION_URLS = [
  // 'https://www.ebay.com/inf/NEWUSERNAME/collections/XXXXXXXXXXX',
];

const USE_COLLECTIONS = true;

// While you rebuild your collection, keep the items already on the site.
// When the new collection has everything you want, set this to false —
// from then on the collection is the single source of truth (remove from it = removed from site).
const CARRY_FORWARD = true;

const SHEET_CSV_URL  = 'https://docs.google.com/spreadsheets/d/1R0PmBS_kJsgU8uvewGm8JHzLphEcUHwDQWraSAOwiFY/export?format=csv&gid=938314832';

const FALLBACK_PINNED_IDS = [
  '336428618001','177934183166','205979855959','177854314498',
  '166210081541','326981617745','306766486521','306816032601',
];

const OUT_FILE = path.join(__dirname, 'listings.json');

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
    const ebayRows = [];            // active eBay rows -> fetched fresh from the eBay API
    const excludeIds = new Set();   // eBay item IDs marked sold / hidden / remove
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

      // eBay rows: Program = eBay, an ebay.com/itm URL, or a bare eBay item ID in column A
      const isEbayRow = program.toLowerCase() === 'ebay' || /ebay\.com\/itm\//i.test(affiliateUrl) || /^(v1\|)?\d{12,13}(\|0)?$/.test(id);
      if (isEbayRow) {
        const ebayId = extractEbayId(id, affiliateUrl);
        if (ebayId) {
          if (status === 'active' || status === '') ebayRows.push({ id: ebayId, category: category, tags: tags });
          else excludeIds.add(ebayId);
          continue;
        }
      }

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

    log('  Found ' + items.length + ' affiliate listings, ' + ebayRows.length + ' eBay rows, ' + excludeIds.size + ' hidden/sold rows');
    return { items: items, ebayRows: ebayRows, excludeIds: excludeIds };
  } catch (err) {
    log('  Sheet fetch failed: ' + err.message);
    return { items: [], ebayRows: [], excludeIds: new Set() };
  }
}

function extractEbayId(idCell, url) {
  var m = String(url || '').match(/\/itm\/(?:[^\/]*\/)?(\d{12,13})/);
  if (m) return m[1];
  m = String(idCell || '').match(/(\d{12,13})/);
  return m ? m[1] : null;
}

// Items from the last successful run — used so existing listings carry forward
// without needing an eBay collection, and as a safety net for temporary API errors.
function loadPreviousEbayItems() {
  try {
    const data = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
    const byId = {};
    (data.pinned || []).forEach(function(it) {
      if (it && it.source === 'eBay') {
        var m = String(it.id).match(/(\d{12,13})/);
        if (m) byId[m[1]] = it;
      }
    });
    return byId;
  } catch (e) { return {}; }
}

function isStillAvailable(item) {
  if (!item) return false;
  var avail = item.estimatedAvailabilities && item.estimatedAvailabilities[0];
  if (avail && avail.estimatedAvailabilityStatus === 'OUT_OF_STOCK') return false;
  if (item.itemEndDate && new Date(item.itemEndDate).getTime() < Date.now()) return false;
  return true;
}

function isGoneError(err) {
  return !!(err && err.message && /: (400|404|410)$/.test(err.message));
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

// ── 2. Fetch eBay collections ──────────────────────────────
async function fetchCollectionIds() {
  log('Fetching eBay collections...');
  var allIds = [];
  for (var c = 0; c < COLLECTION_URLS.length; c++) {
    try {
      const res = await fetch(COLLECTION_URLS[c], {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const html = await res.text();
      const pattern = /\/itm\/(\d{12,13})/g;
      var match;
      var count = 0;
      while ((match = pattern.exec(html)) !== null) {
        if (!allIds.includes(match[1])) { allIds.push(match[1]); count++; }
      }
      log('  Collection ' + (c + 1) + ': ' + count + ' items');
    } catch (err) {
      log('  Collection ' + (c + 1) + ' failed: ' + err.message);
    }
  }
  if (!allIds.length) {
    log('  No collection items found — continuing without them');
    return [];
  }
  log('  Total from all collections: ' + allIds.length);
  return allIds;
}

// ── Fetch home collection IDs ─────────────────────────────
async function fetchHomeCollectionIds() {
  log('Fetching home collection...');
  var allIds = [];
  for (var c = 0; c < HOME_COLLECTION_URLS.length; c++) {
    try {
      const res = await fetch(HOME_COLLECTION_URLS[c], {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const html = await res.text();
      const pattern = /\/itm\/(\d{12,13})/g;
      var match;
      var count = 0;
      while ((match = pattern.exec(html)) !== null) {
        if (!allIds.includes(match[1])) { allIds.push(match[1]); count++; }
      }
      log('  Home collection ' + (c + 1) + ': ' + count + ' items');
    } catch (err) {
      log('  Home collection ' + (c + 1) + ' failed: ' + err.message);
    }
  }
  log('  Total home items: ' + allIds.length);
  return allIds;
}

function detectCategory(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('watch') || t.includes('wrist'))         return 'Watches & Timepieces';
  if (t.includes('glasses') || t.includes('frames') || t.includes('sunglasses') || t.includes('eyewear') || t.includes('spectacles') || t.includes('optical')) return 'Eyewear & Sunglasses';
  var artTerms = ['painting','oil on','canvas','watercolor','watercolour','drawing','sketch','pastel','gouache','acrylic','serigraph','silkscreen','photograph','original art','mixed media','charcoal'];
  var printTerms = ['print','giclee','reproduction','poster','lithograph','offset'];
  if (artTerms.some(function(w){return t.includes(w);}) && !printTerms.some(function(w){return t.includes(w);})) return 'Art & Originals';
  var ceramicTerms = ['vase','bowl','pitcher','platter','figurine','ceramic','pottery','porcelain','stoneware','earthenware','urn','jug','crock'];
  if (ceramicTerms.some(function(w){return t.includes(w);})) return 'Ceramics & Pottery';
  var barwareTerms = ['decanter','barware','cocktail shaker','silver tray','candlestick','candelabra','serving tray','ice bucket','coaster','tankard','goblet'];
  if (barwareTerms.some(function(w){return t.includes(w);})) return 'Barware & Silver';
  var homeTerms = ['mirror','lamp','lantern','wall decor','tapestry','cushion','pillow','throw','rug','clock','bookend','sculpture','figurine','candle holder','picture frame','table cloth'];
  if (homeTerms.some(function(w){return t.includes(w);})) return 'Home Decor';
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

function withAffiliate(url, itemId) {
  if (url && /campid=/.test(url)) return url;
  var m = String(itemId || url || '').match(/(\d{12,13})/);
  if (!m) return url;
  return 'https://www.ebay.com/itm/' + m[1] + '?mkevt=1&mkcid=1&mkrid=711-53200-19255-0&campid=' + CAMPAIGN_ID + '&toolid=10050';
}

function normaliseHome(item) {
  const price = parseFloat(item.price && item.price.value ? item.price.value : 0);
  // Detect specific home sub-category, default to Home Decor
  var cat = detectCategory(item.title);
  var homeCategories = ['Art & Originals', 'Ceramics & Pottery', 'Barware & Silver', 'Home Decor'];
  if (homeCategories.indexOf(cat) === -1) cat = 'Home Decor';
  return {
    id: item.itemId,
    title: item.title,
    price: price,
    priceFormatted: '$' + price.toFixed(2),
    imageUrl: item.image && item.image.imageUrl ? item.image.imageUrl : null,
    affiliateUrl: withAffiliate(item.itemAffiliateWebUrl || item.itemWebUrl, item.itemId),
    condition: item.condition || 'Pre-owned',
    source: 'eBay',
    category: cat,
    tags: inferTags(item.title).concat(['home', 'vintage decor']),
    pinned: true,
    matchLabel: 'Hand-picked',
    location: [item.itemLocation && item.itemLocation.city, item.itemLocation && item.itemLocation.stateOrProvince].filter(Boolean).join(', '),
    scoutedAt: new Date().toISOString(),
  };
}

function normalise(item, pinned) {
  const price = parseFloat(item.price && item.price.value ? item.price.value : 0);
  return {
    id: item.itemId,
    title: item.title,
    price: price,
    priceFormatted: '$' + price.toFixed(2),
    imageUrl: item.image && item.image.imageUrl ? item.image.imageUrl : null,
    affiliateUrl: withAffiliate(item.itemAffiliateWebUrl || item.itemWebUrl, item.itemId),
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
  const sheet = await fetchSheetListings();
  const sheetListings = sheet.items;

  // ── Source 2: eBay collection ─────────────────────────
  log('Getting eBay OAuth token...');
  const token = await getToken(CLIENT_ID, CLIENT_SECRET);
  log('Token obtained ✓');

  // Candidates = last run's eBay items + eBay rows in the sheet (+ collections if re-enabled)
  const prevItems = loadPreviousEbayItems();
  const candidates = new Map();   // id -> { category, tags }
  if (CARRY_FORWARD) {
    Object.keys(prevItems).forEach(function(id) { candidates.set(id, { category: prevItems[id].category || null, tags: [] }); });
  }
  sheet.ebayRows.forEach(function(r) {
    var existing = candidates.get(r.id) || {};
    candidates.set(r.id, {
      category: r.category || existing.category || null,
      tags: r.tags ? r.tags.split(',').map(function(t) { return t.trim(); }).filter(Boolean) : [],
    });
  });
  if (USE_COLLECTIONS) {
    const mainIds = await fetchCollectionIds();
    const homeIds = await fetchHomeCollectionIds();
    mainIds.forEach(function(id) {
      var prior = candidates.get(id) || {};
      candidates.set(id, { category: prior.category || (prevItems[id] && prevItems[id].category) || null, tags: [] });
    });
    homeIds.forEach(function(id) {
      var prior = candidates.get(id) || {};
      candidates.set(id, { category: prior.category || (prevItems[id] && prevItems[id].category) || null, tags: [], homeDefault: true });
    });
  }
  sheet.excludeIds.forEach(function(id) { candidates.delete(id); });

  const pinnedIds = Array.from(candidates.keys());
  log('Checking ' + pinnedIds.length + ' eBay items (carry-forward ' + (CARRY_FORWARD ? 'on' : 'off') + ', ' + sheet.ebayRows.length + ' from sheet)...');

  const HOME_CATS = ['Art & Originals', 'Home Decor', 'Ceramics & Pottery', 'Barware & Silver'];
  const BATCH_SIZE = 10;
  const ebayPinned = [];
  var soldCount = 0, keptCount = 0;

  for (var b = 0; b < pinnedIds.length; b += BATCH_SIZE) {
    const batch = pinnedIds.slice(b, b + BATCH_SIZE);
    log('  Batch ' + (Math.floor(b / BATCH_SIZE) + 1) + '/' + Math.ceil(pinnedIds.length / BATCH_SIZE) + ' (' + batch.length + ' items)...');

    const results = await Promise.allSettled(
      batch.map(function(id) { return getItem(id, token, CAMPAIGN_ID); })
    );

    results.forEach(function(r, i) {
      var id = batch[i];
      var cand = candidates.get(id) || {};
      if (r.status === 'fulfilled') {
        var item = r.value;
        if (!isStillAvailable(item)) { soldCount++; log('    – Sold/ended, removed: ' + id); return; }
        if (!(item.image && item.image.imageUrl)) { log('    ✗ No image: ' + id); return; }
        var n = normalise(item, true);
        if (cand.category) n.category = cand.category;
        if (cand.homeDefault && HOME_CATS.indexOf(n.category) === -1) n.category = 'Home Decor';
        if (HOME_CATS.indexOf(n.category) !== -1) n.tags = n.tags.concat(['home', 'vintage decor']);
        if (cand.tags && cand.tags.length) n.tags = Array.from(new Set(n.tags.concat(cand.tags)));
        ebayPinned.push(n);
      } else if (isGoneError(r.reason)) {
        soldCount++;
        log('    – Listing gone, removed: ' + id);
      } else if (prevItems[id]) {
        // Temporary problem (network / rate limit) — keep the last known copy rather than dropping it
        keptCount++;
        ebayPinned.push(prevItems[id]);
        log('    ! Could not verify ' + id + ' (' + (r.reason && r.reason.message) + ') — kept from last run');
      } else {
        log('    ✗ Item ' + id + ': ' + (r.reason && r.reason.message));
      }
    });

    if (b + BATCH_SIZE < pinnedIds.length) await new Promise(function(r) { setTimeout(r, 500); });
  }

  // Safety: never overwrite a healthy listings file with an empty result
  if (ebayPinned.length === 0 && Object.keys(prevItems).length > 20) {
    console.error('ABORT: 0 eBay items survived but ' + Object.keys(prevItems).length + ' existed last run. Not overwriting listings.json.');
    process.exit(1);
  }

  const homePinned = ebayPinned.filter(function(i) { return HOME_CATS.indexOf(i.category) !== -1; });
  log('eBay items: ' + ebayPinned.length + ' live, ' + soldCount + ' removed (sold/ended), ' + keptCount + ' kept after temporary errors');

  const allPinned = sheetListings.concat(ebayPinned);
  log('Total pinned: ' + allPinned.length + ' (' + sheetListings.length + ' affiliate sheet + ' + ebayPinned.length + ' eBay)');

  // ── Source 3: eBay scout ──────────────────────────────
  log('\nRunning category scouts...');
  const trustedScouted = [];
  const broadScouted = [];

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
        sellers: query.sellers || [],
        trusted: query.trusted || false,
        limit: query.limit,
        campaignId: CAMPAIGN_ID,
      });
      const filtered = filterBatch(raw, query);
      if (query.trusted) {
        for (var j = 0; j < filtered.length; j++) trustedScouted.push(filtered[j]);
      } else {
        for (var k = 0; k < filtered.length; k++) broadScouted.push(filtered[k]);
      }
      log('    ' + raw.length + ' raw → ' + filtered.length + ' passed filter');
      await new Promise(function(r) { setTimeout(r, 400); });
    } catch (err) {
      log('    ✗ Failed: ' + err.message);
    }
  }

  // Order: handpicked → trusted sellers → broad scouted
  const allScouted = trustedScouted.concat(broadScouted);

  // ── Save listings.json ────────────────────────────────
  const output = {
    scoutedAt: new Date().toISOString(),
    totalPinned: allPinned.length,
    totalScouted: allScouted.length,
    total: allPinned.length + allScouted.length,
    pinned: allPinned,
    scouted: allScouted,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
  log('\n✓ Done — ' + allPinned.length + ' pinned + ' + allScouted.length + ' scouted = ' + output.total + ' total gems');
  log('  Affiliate sheet: ' + sheetListings.length + ' | eBay: ' + ebayPinned.length + ' (home: ' + homePinned.length + ') | Trusted: ' + trustedScouted.length + ' | Broad: ' + broadScouted.length);
}

main().catch(function(err) {
  console.error('Scout failed:', err);
  process.exit(1);
});
