/**
 * Gem Scouter — Scout Query Definitions
 * Categories: Watches, Jewelry, Paintings, Eyewear
 * Max price: $500
 *
 * trusted: true  → skips keyword/feedback filters, pulls from specific sellers
 * trusted: false → broad scout, full filter engine applied, limit 100 then trim to 10
 */

// ── Trusted eBay sellers by category ─────────────────────
const TRUSTED_SELLERS = {
  eyewear:  ['sunglassmuseum'],
  jewelry:  ['jewelry4you', 'electriccityvintage',],
  watches:  ['timekeepersco', 'keepwatchin'],
  paintings: ['homedecordistributors'],
  mixed:    [],   // reserved for multi-category sellers
};

module.exports = [

  // ══════════════════════════════════════════════════════
  // BROAD SCOUTS — disabled for now, re-enable when ready
  // ══════════════════════════════════════════════════════

  // { id: 'watches', trusted: false, query: 'vintage watch', categoryId: '31387', ... },
  // { id: 'jewelry', trusted: false, query: 'vintage jewelry', categoryId: '48579', ... },
  // { id: 'paintings', trusted: false, query: 'original canvas painting vintage', categoryId: '60437', ... },
  // { id: 'eyewear', trusted: false, query: 'vintage eyeglasses', categoryId: '56185', ... },
  // { id: 'eyewear', trusted: false, query: 'vintage sunglasses', categoryId: '79720', ... },

  // ══════════════════════════════════════════════════════
  // TRUSTED SELLER SCOUTS — skip keyword filter, price only
  // ══════════════════════════════════════════════════════

  {
    id: 'eyewear',
    label: 'Eyewear & Sunglasses',
    icon: '🕶',
    tags: ['eyewear', 'vintage', 'frames'],
    trusted: true,
    query: 'vintage sunglasses',
    categoryId: null,
    conditions: ['USED', 'NEW'],
    sellers: TRUSTED_SELLERS.eyewear,
    requireOneOf: [],
    exclude: ['lot','wholesale','broken','parts','replica'],
    priceMin: 10,
    priceMax: 500,
    limit: 100,
  },

  {
    id: 'jewelry',
    label: 'Jewelry & Accessories',
    icon: '💍',
    tags: ['jewelry', 'vintage'],
    trusted: true,
    query: 'vintage',
    categoryId: null,
    conditions: ['USED', 'NEW'],
    sellers: TRUSTED_SELLERS.jewelry,
    requireOneOf: [],
    exclude: ['lot','wholesale','replica','broken','parts'],
    priceMin: 10,
    priceMax: 500,
    limit: 100,
  },

  {
    id: 'watches',
    label: 'Watches & Timepieces',
    icon: '⌚',
    tags: ['watch', 'vintage'],
    trusted: true,
    query: 'vintage',
    categoryId: null,
    conditions: ['USED', 'NEW'],
    sellers: TRUSTED_SELLERS.watches,
    requireOneOf: [],
    exclude: ['lot','wholesale','replica','broken','parts','smartwatch','digital','fitbit','apple'],
    priceMin: 15,
    priceMax: 500,
    limit: 100,
  },
  {
    id: 'paintings',
    label: 'Paintings',
    icon: '🖼',
    tags: ['paintings', 'vintage','original'],
    trusted: true,
    query: 'paintings',
    categoryId: null,
    conditions: ['USED'],
    sellers: TRUSTED_SELLERS.paintings,
    requireOneOf: [],
    exclude: ['print','giclee','reproduction','poster','lithograph','lot','canvas print','digital','ai generated','copy','replica'],
    priceMin: 15,
    priceMax: 500,
    limit: 100,
  },


];
