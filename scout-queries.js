/**
 * Gem Scouter — Scout Query Definitions
 * Categories: Watches, Jewelry, Paintings, Eyewear
 * Max price: $500 · Limit: 100 per category
 */

module.exports = [

  {
    id: 'watches',
    label: 'Watches & Timepieces',
    icon: '⌚',
    tags: ['watch', 'vintage', 'mechanical'],
    query: 'vintage watch',
    categoryId: '31387',
    conditions: ['USED'],
    requireOneOf: ['mechanical','automatic','hand-wind','manual wind','vintage','antique','swiss','art deco','1900s','timepiece','rare','gem'],
    exclude: ['kids','childrens','lot','parts','repair','broken','replica','smartwatch','digital','fitbit','apple','wholesale','FREE SHIPPING FREE SHIPPING'],
    priceMin: 15,
    priceMax: 500,
    limit: 100,
  },

  {
    id: 'jewelry',
    label: 'Jewelry & Accessories',
    icon: '💍',
    tags: ['jewelry', 'vintage', 'handmade'],
    query: 'vintage jewelry',
    categoryId: '48579',
    conditions: ['USED'],
    requireOneOf: ['vintage','antique','handmade','art deco','art nouveau','sterling','rare','gem','filigree','bakelite','enamel','mid century','folk','one of a kind','studio'],
    exclude: ['dish','case','barbie','dolls','kids','childrens','lot','wholesale','replica','fashion jewelry','costume lot','mass','factory','brooch','broach','vase','box','organizer','holder','lapel'],
    priceMin: 10,
    priceMax: 500,
    limit: 100,
  },

  {
    id: 'paintings',
    label: 'Paintings & Original Art',
    icon: '🖼',
    tags: ['painting', 'original', 'art'],
    query: 'original canvas painting vintage',
    categoryId: '60437',
    conditions: ['USED'],
    requireOneOf: ['unique','fauvism','neoclassical','romantic','impressionist','expressionist','modernist','original','signed','oil on canvas','oil on board','acrylic','watercolor','modern','folk art','listed artist','abstract','landscape','hand painted','one of a kind'],
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
    query: 'vintage eyeglasses',
    categoryId: '56185',
    conditions: ['USED'],
    requireOneOf: ['vintage','antique','deadstock','nos','art deco','mid century','1950s','1960s','1970s','gold filled','tortoise','acetate','optical','bausch','ray ban','cat eye'],
    exclude: ['shirt','kids','childrens','lot','wholesale','replica','brand new','cheap','broken','parts'],
    priceMin: 10,
    priceMax: 500,
    limit: 100,
  },
    {
    id: 'eyewear',
    label: 'Eyewear & Sunglasses',
    icon: '🕶',
    tags: ['eyewear', 'vintage', 'frames'],
    query: 'vintage sunglasses',
    categoryId: '79720',
    conditions: ['USED'],
    requireOneOf: ['vintage','antique','deadstock','nos','art deco','mid century','1950s','1960s','1970s','gold filled','tortoise','acetate','optical','bausch','ray ban','cat eye'],
    exclude: ['shirt','kids','childrens','lot','wholesale','replica','brand new','cheap','broken','parts'],
    priceMin: 10,
    priceMax: 500,
    limit: 100,
  },

];
