/**
 * Gem Scouter — eBay Browse API Client
 */

const EBAY_API_BASE = 'https://api.ebay.com';
const EBAY_AUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token';

let cachedToken = null;
let tokenExpiry = null;

async function getToken(clientId, clientSecret) {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 300000) {
    return cachedToken;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(EBAY_AUTH_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`eBay auth failed: ${response.status} — ${text}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

async function getItem(itemId, token, campaignId) {
  const url = `${EBAY_API_BASE}/buy/browse/v1/item/v1|${itemId}|0`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      'X-EBAY-C-ENDUSERCTX': campaignId ? `affiliateCampaignId=${campaignId}` : '',
    },
  });

  if (!response.ok) {
    throw new Error(`Item ${itemId}: ${response.status}`);
  }
  return response.json();
}

async function searchItems({ token, query, categoryId, priceMin, priceMax, conditions = ['USED'], limit = 20, campaignId }) {
  const url = new URL(`${EBAY_API_BASE}/buy/browse/v1/item_summary/search`);

  const filters = [
    `conditions:{${conditions.join('|')}}`,
    'itemLocationCountry:US',
    'buyingOptions:{FIXED_PRICE}',
  ];

  if (priceMin != null || priceMax != null) {
    filters.push(`price:[${priceMin || 0}..${priceMax || 10000}]`);
  }

  url.searchParams.set('q', query);
  url.searchParams.set('filter', filters.join(','));
  url.searchParams.set('sort', 'newlyListed');
  url.searchParams.set('limit', String(limit));
  if (categoryId) url.searchParams.set('category_ids', categoryId);

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      'X-EBAY-C-ENDUSERCTX': campaignId ? `affiliateCampaignId=${campaignId}` : '',
    },
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status} — ${await response.text()}`);
  }

  const data = await response.json();
  return data.itemSummaries || [];
}

module.exports = { getToken, getItem, searchItems };
