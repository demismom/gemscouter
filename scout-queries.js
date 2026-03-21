/**
 * Gem Scouter — Scout Query Definitions
 * Categories: Watches, Jewelry, Paintings, Eyewear
 * Max price: $500 · Limit: 100 per category (eBay API max)
 */

module.exports = [

  {
    id: 'watches',
    label: 'Watches & Timepieces',
    icon: '⌚',
    tags: ['watch', 'vintage', 'mechanical'],
    query: 'vintage mechanical wristwatch',
    categoryId: '31387',
    conditions: ['USED'],
    requireOneOf: ['mechanical','automatic','hand-wind','manual wind','vintage','antique','swiss','art deco','signed'],
    exclude: ['lot','parts','repair','broken','replica','smartwatch','digital','fitbit','apple','wholesale'],
    priceMin: 15,
    priceMax: 500,
    limit: 100,
  },

  {
    id: 'jewelry',
    label: 'Jewelry & Accessories',
    icon: '💍',
    tags: ['jewelry', 'vintage', 'handmade'],
    query: 'vintage handmade jewelry sterling silver art deco',
    categoryId: '48579',
    conditions: ['USED'],
    requireOneOf: ['vintage','antique','handmade','art deco','art nouveau','sterling','signed','brooch','filigree','bakelite','enamel','mid century','folk','one of a kind','studio'],
    exclude: ['lot','wholesale','replica','fashion jewelry','costume lot','new','mass','factory'],
    priceMin: 10,
    priceMax: 500,
    limit: 100,
  },

  {
    id: 'paintings',
    label: 'Paintings & Original Art',
    icon: '🖼',
    tags: ['painting', 'original', 'art'],
    query: 'original oil painting signed vintage',
    categoryId: '360',
    conditions: ['USED'],
    requireOneOf: ['original','signed','oil on canvas','oil on board','acrylic','watercolor','gouache','folk art','listed artist','abstract','landscape','hand painted','one of a kind'],
    exclude: ['print','giclee','reproduction','poster','lithograph','lot','canvas print','digital','ai generated','copy','replica'],
    priceMin: 10,
    priceMax: 500,
    limit: 100,
  },

  {
    id: 'eyewear',
    label: 'Eyewear & Sunglasses',
    icon: '🕶',
    tags: ['eyewear', 'vintage', 'frames'],
    query: 'vintage eyeglasses frames deadstock sunglasses',
    categoryId: '179247',
    conditions: ['USED'],
    requireOneOf: ['vintage','antique','deadstock','nos','art deco','mid century','1950s','1960s','1970s','gold filled','tortoise','acetate','optical'],
    exclude: ['lot','wholesale','replica','new','modern','brand new','cheap'],
    priceMin: 10,
    priceMax: 500,
    limit: 100,
  },

];
