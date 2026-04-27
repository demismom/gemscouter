/**
 * Gem Scouter — eBay Browse API Client
 */

const EBAY_API_BASE = 'https://api.ebay.com';
const EBAY_AUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token';

let cachedToken = null;
let tokenExpiry = null;

// ── RETRY HELPER ─────────────────────────────────────────
// Retries a fetch call up to maxRetries times with exponential backoff.
// Treats network errors (timeout, connection refused) and 5xx responses as retryable.
async function fetchWithRetry(url, options = {}, maxRetries = 3, timeoutMs = 15000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);

      // Retry on 5xx server errors (eBay occasionally returns 503 under load)
      if (response.status >= 500 && attempt < maxRetries) {
        const wait = attempt * 2000;
        console.log(`  eBay returned ${response.status} — retrying in ${wait / 1000}s (attempt ${attempt}/${maxRetries})`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;

      const isTimeout = err.name === 'AbortError' || err.code === 'UND_ERR_CONNECT_TIMEOUT';
      const isNetwork = isTimeout || err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED');

      if (isNetwork && attempt < maxRetries) {
        const wait = attempt * 3000;
        console.log(`  Network error (${err.message.slice(0, 60)}) — retrying in ${wait / 1000}s (attempt ${attempt}/${maxRetries})`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

// ── GET TOKEN ─────────────────────────────────────────────
async function getToken(clientId, clientSecret) {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 300000) {
    return cachedToken;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetchWithRetry(
    EBAY_AUTH_URL,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
    },
    3,    // maxRetries
    15000 // 15 second timeout per attempt
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`eBay auth failed: ${response.status} — ${text}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

// ── GET ITEM ──────────────────────────────────────────────
async function getItem(itemId, token, campaignId) {
  const url = `${EBAY_API_BASE}/buy/browse/v1/item/v1|${itemId}|0`;

  const response = await fetchWithRetry(
    url,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        'X-EBAY-C-ENDUSERCTX': campaignId ? `affiliateCampaignId=${campaignId}` : '',
      },
    },
    2,    // maxRetries
    12000 // 12 second timeout
  );

  if (!response.ok) {
    throw new Error(`Item ${itemId}: ${response.status}`);
  }
  return response.json();
}

// ── SEARCH ITEMS ──────────────────────────────────────────
async function searchItems({ token, query, categoryId, priceMin, priceMax, conditions = ['USED'], sellers = [], limit = 20, campaignId, trusted = false }) {

  // Safety guard — never run a trusted query without sellers, it would return all of eBay
  if (trusted && (!sellers || sellers.length === 0)) {
    console.log('  Skipped — trusted query with no sellers defined');
    return [];
  }

  const url = new URL(`${EBAY_API_BASE}/buy/browse/v1/item_summary/search`);

  const CONDITION_MAP = {
    'NEW':          '1000',
    'USED':         '3000',
    'UNGRADED':     '10',
    'PRE_OWNED':    '3000',
  };

  const conditionIds = conditions.map(function(c) {
    return CONDITION_MAP[c] || c;
  });

  const filters = [
    `conditionIds:{${conditionIds.join('|')}}`,
    'itemLocationCountry:US',
    'buyingOptions:{FIXED_PRICE}',
  ];

  if (priceMin != null || priceMax != null) {
    filters.push(`price:[${priceMin || 0}..${priceMax || 10000}]`);
  }

  if (sellers && sellers.length > 0) {
    filters.push(`sellers:{${sellers.join('|')}}`);
  }

  url.searchParams.set('q', query);
  url.searchParams.set('filter', filters.join(','));
  url.searchParams.set('sort', 'newlyListed');
  url.searchParams.set('limit', String(limit));
  if (categoryId) url.searchParams.set('category_ids', categoryId);

  const response = await fetchWithRetry(
    url.toString(),
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        'X-EBAY-C-ENDUSERCTX': campaignId ? `affiliateCampaignId=${campaignId}` : '',
      },
    },
    2,    // maxRetries
    12000 // 12 second timeout
  );

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status} — ${await response.text()}`);
  }

  const data = await response.json();
  return data.itemSummaries || [];
}

module.exports = { getToken, getItem, searchItems };
