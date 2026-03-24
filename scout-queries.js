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
  jewelry:  ['jewelry4you', 'electriccityvintage', 'iridescentantiquesandoddities', 'mykroz-3', 'homedecordistributors'],
  watches:  ['timekeepersco', 'keepwatchin'],
  mixed:    ['shopfront7'],
};

module.exports = [

  // ══════════════════════════════════════════════════════
  // BROAD SCOUTS — full filter engine, keep top 10 per run
  // ══════════════════════════════════════════════════════

  {
    id: 'watches',
    label: 'Watches & Timepieces',
    icon: '⌚',
    tags: ['watch', 'vintage'],
    trusted: false,
    query: 'vintage watch',
    categoryId: '31387',
    conditions: ['USED'],
    requireOneOf: ['20s','40s','50s','60s','70s','bracelet','mechanical','automatic','hand-wind','manual wind','vintage','antique','swiss','art deco','1900s','timepiece','rare','gem'],
    exclude: ['disney','casio','kids','childrens','lot','parts','repair','broken','replica','smartwatch','digital','fitbit','apple','wholesale'],
    priceMin: 15,
    priceMax: 500,
    limit: 100,
    keepTop: 10,
  },

  {
    id: 'jewelry',
    label: 'Jewelry & Accessories',
    icon: '💍',
    tags: ['jewelry', 'vintage'],
    trusted: false,
    query: 'vintage jewelry',
    categoryId: '48579',
    conditions: ['USED'],
    requireOneOf: ['20s','40s','50s','60s','70s','vintage','antique','handmade','art deco','art nouveau','sterling','rare','gem','filigree','bakelite','enamel','mid century','folk','one of a kind','studio'],
    exclude: ['disney','dish','case','barbie','doll','kids','childrens','lot','wholesale','replica','fashion jewelry','costume lot','mass','factory','brooch','broach','vase','box','organizer','holder','lapel'],
    priceMin: 10,
    priceMax: 500,
    limit: 100,
    keepTop: 10,
  },

  {
    id: 'paintings',
    label: 'Paintings & Original Art',
    icon: '🖼',
    tags: ['painting', 'original', 'art'],
    trusted: false,
    query: 'original canvas painting vintage',
    categoryId: '60437',
    conditions: ['USED'],
    requireOneOf: ['20s','40s','50s','60s','70s','unique','fauvism','neoclassical','romantic','impressionist','expressionist','modernist','original','signed','oil on canvas','oil on board','acrylic','watercolor','modern','folk art','listed artist','abstract','landscape','hand painted','one of a kind'],
    exclude: ['disney','print','giclee','reproduction','poster','lithograph','lot','canvas print','digital','ai generated','copy','replica'],
    priceMin: 10,
    priceMax: 500,
    limit: 100,
    keepTop: 10,
  },

  {
    id: 'eyewear',
    label: 'Eyewear & Sunglasses',
    icon: '🕶',
    tags: ['eyewear', 'vintage', 'frames'],
    trusted: false,
    query: 'vintage eyeglasses',
    categoryId: '56185',
    conditions: ['USED'],
    requireOneOf: ['20s','40s','50s','60s','70s','vintage','antique','deadstock','nos','art deco','mid century','1950s','1960s','1970s','gold filled','tortoise','acetate','optical','bausch','ray ban','cat eye'],
    exclude: ['disney','shirt','kids','childrens','lot','wholesale','replica','brand new','cheap','broken','parts'],
    priceMin: 10,
    priceMax: 500,
    limit: 100,
    keepTop: 10,
  },

  {
    id: 'eyewear',
    label: 'Eyewear & Sunglasses',
    icon: '🕶',
    tags: ['eyewear', 'vintage', 'frames'],
    trusted: false,
    query: 'vintage sunglasses',
    categoryId: '79720',
    conditions: ['USED'],
    requireOneOf: ['20s','40s','50s','60s','70s','vintage','antique','deadstock','nos','art deco','mid century','1950s','1960s','1970s','gold filled','tortoise','acetate','optical','bausch','ray ban','cat eye'],
    exclude: ['disney','shirt','kids','childrens','lot','wholesale','replica','brand new','cheap','broken','parts'],
    priceMin: 10,
    priceMax: 500,
    limit: 100,
    keepTop: 10,
  },

  // ══════════════════════════════════════════════════════
  // TRUSTED SELLER SCOUTS — skip keyword filter, price only
  // ══════════════════════════════════════════════════════

  {
    id: 'eyewear',
    label: 'Eyewear & Sunglasses',
    icon: '🕶',
    tags: ['eyewear', 'vintage', 'frames'],
    trusted: true,
    query: 'sunglasses',
    categoryId: '79720',
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
    query: 'jewelry',
    categoryId: '48579',
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
    query: 'watch',
    categoryId: '31387',
    conditions: ['USED', 'NEW'],
    sellers: TRUSTED_SELLERS.watches,
    requireOneOf: [],
    exclude: ['lot','wholesale','replica','broken','parts','smartwatch','digital','fitbit','apple'],
    priceMin: 15,
    priceMax: 500,
    limit: 100,
  },

  {
    id: 'jewelry',
    label: 'Jewelry & Accessories',
    icon: '💍',
    tags: ['jewelry', 'vintage'],
    trusted: true,
    query: 'jewelry',
    categoryId: '48579',
    conditions: ['USED', 'NEW'],
    sellers: TRUSTED_SELLERS.mixed,
    requireOneOf: [],
    exclude: ['lot','wholesale','replica','broken','parts'],
    priceMin: 10,
    priceMax: 500,
    limit: 100,
  },

];
