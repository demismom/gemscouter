/**
 * Gem Scouter — Scout Query Definitions
 * Trusted queries MUST have sellers defined — empty sellers = query is skipped
 */

const TRUSTED_SELLERS = {
  eyewear:   ['sunglassmuseum'],
  jewelry:   ['jewelry4you', 'electriccityvintage'],
  watches:   ['timekeepersco', 'keepwatchin'],
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
  // TRUSTED SELLER SCOUTS — only these sellers, no broad search
  // ══════════════════════════════════════════════════════

  {
    id: 'eyewear',
    label: 'Eyewear & Sunglasses',
    icon: '🕶',
    tags: ['eyewear', 'vintage', 'frames'],
    trusted: true,
    query: 'vintage',
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


];
