/**
 * Gem Scouter — Scout Query Definitions
 * Edit these to change what gets surfaced automatically.
 * Add a new entry to add a new category.
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
    priceMax: null,
    limit: 24,
  },

  {
    id: 'ceramics',
    label: 'Ceramics & Pottery',
    icon: '🏺',
    tags: ['ceramic', 'handmade', 'pottery'],
    query: 'handmade studio pottery stoneware',
    categoryId: '870',
    conditions: ['USED'],
    requireOneOf: ['handmade','hand thrown','hand-thrown','studio','stoneware','earthenware','signed','folk','art pottery','raku','wheel thrown','hand built'],
    exclude: ['lot','wholesale','reproduction','replica','factory','machine made'],
    priceMin: 10,
    priceMax: null,
    limit: 20,
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
    priceMax: null,
    limit: 20,
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
    priceMax: null,
    limit: 20,
  },

  {
    id: 'textiles',
    label: 'Textiles & Fiber Arts',
    icon: '🧶',
    tags: ['textile', 'handmade', 'woven'],
    query: 'handwoven wall hanging fiber art vintage textile',
    categoryId: '160731',
    conditions: ['USED'],
    requireOneOf: ['handwoven','hand woven','handmade','fiber art','wall hanging','tapestry','macrame','needlework','embroidery','quilt','vintage textile','folk','wool','natural fiber'],
    exclude: ['lot','wholesale','machine made','factory','printed','digital print','reproduction'],
    priceMin: 10,
    priceMax: null,
    limit: 16,
  },

  {
    id: 'eyewear',
    label: 'Eyewear & Sunglasses',
    icon: '🕶',
    tags: ['eyewear', 'vintage', 'frames'],
    query: 'vintage eyeglasses frames deadstock nos sunglasses',
    categoryId: '179247',
    conditions: ['USED'],
    requireOneOf: ['vintage','antique','deadstock','nos','hand crafted','art deco','mid century','1950s','1960s','1970s','gold filled','tortoise','acetate','optical'],
    exclude: ['lot','wholesale','replica','fashion','mass','new','modern','brand new','plastic cheap'],
    priceMin: 10,
    priceMax: null,
    limit: 16,
  },

];
