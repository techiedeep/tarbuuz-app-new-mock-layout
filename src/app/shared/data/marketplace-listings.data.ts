/**
 * The single source for marketplace listing data - used by
 * SupplierMarketplace (the standalone /marketplace page), review-menu's
 * "Specialty Extras" drawer, and foodie-events' post-bid-acceptance
 * supplier drawer. Previously duplicated separately in two of those
 * three places; consolidated here once a third consumer needed the same
 * data, rather than let a third independent copy start drifting from
 * the other two.
 */

export interface MarketplaceListing {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly price: string;
  readonly category: string;
  readonly supplierName: string;
  readonly supplierRating: number;
  readonly supplierReviews: number;
  readonly location: string;
  readonly supplierUrl: string;
}

// Real, illustrative listings spanning all 10 categories already
// established on the Supplier Profile page (PRODUCT_CATEGORY_OPTIONS) —
// deliberately from many different fictional suppliers rather than one,
// since the whole point of a listing page is comparing across suppliers,
// not viewing one supplier's own catalog (which is what supplier-profile
// already does). Ice cream/cakes/tableware from the user's own examples
// are included, alongside the other seven categories, so the page reads
// as a genuine marketplace rather than a dessert-only showcase.
export const MARKETPLACE_LISTINGS: readonly MarketplaceListing[] = [
  { id: 'p1', title: 'Custom Tiered Celebration Cake', description: 'A cake designed around your event\u2019s theme and flavor preferences, serves 40\u201360 guests.', icon: '\ud83c\udf82', price: 'From $220', category: 'desserts-sweets', supplierName: 'Sweetgrass Bakehouse', supplierRating: 4.9, supplierReviews: 62, location: 'Portland, OR' , supplierUrl: 'https://www.sweetgrassbakehouse.com' },
  { id: 'p2', title: 'Small-Batch Ice Cream Bar', description: '3\u20135 flavors from the current rotation, self-serve or scooped by staff.', icon: '\ud83c\udf66', price: 'From $6/guest', category: 'desserts-sweets', supplierName: 'Scoop & Stir Creamery', supplierRating: 4.8, supplierReviews: 41, location: 'Portland, OR' , supplierUrl: 'https://www.scoopandstircreamery.com' },
  { id: 'p3', title: 'Macaron Tower', description: 'Handmade French macarons in seasonal flavors, arranged as a display centerpiece.', icon: '\ud83c\udf6a', price: 'From $140', category: 'desserts-sweets', supplierName: 'Sweetgrass Bakehouse', supplierRating: 4.9, supplierReviews: 62, location: 'Portland, OR' , supplierUrl: 'https://www.sweetgrassbakehouse.com' },
  { id: 'p4', title: 'Mobile Cocktail Bar Service', description: 'Full bar setup with a licensed bartender, your choice of a curated cocktail menu.', icon: '\ud83c\udf79', price: 'From $18/guest', category: 'beverages-bar', supplierName: 'Coastal Pour Co.', supplierRating: 4.7, supplierReviews: 38, location: 'Beaverton, OR' , supplierUrl: 'https://www.coastalpourco.com' },
  { id: 'p5', title: 'Zero-Proof Mocktail Station', description: 'A full mocktail menu so non-drinking guests get the same craft experience.', icon: '\ud83c\udf79', price: 'From $9/guest', category: 'beverages-bar', supplierName: 'Coastal Pour Co.', supplierRating: 4.7, supplierReviews: 38, location: 'Beaverton, OR' , supplierUrl: 'https://www.coastalpourco.com' },
  { id: 'p6', title: 'Floral Centerpiece Package', description: 'Seasonal, locally sourced arrangements sized for standard round tables.', icon: '\ud83d\udc90', price: 'From $65/table', category: 'decor-styling', supplierName: 'Bloom & Bough Events', supplierRating: 4.9, supplierReviews: 71, location: 'Lake Oswego, OR' , supplierUrl: 'https://www.bloomandbough.com' },
  { id: 'p7', title: 'Balloon Garland Installation', description: 'An organic-style garland built to your color palette, installed on-site.', icon: '\ud83c\udf88', price: 'From $380', category: 'decor-styling', supplierName: 'Bloom & Bough Events', supplierRating: 4.9, supplierReviews: 71, location: 'Lake Oswego, OR' , supplierUrl: 'https://www.bloomandbough.com' },
  { id: 'p8', title: 'Vintage China Place Setting', description: 'Mismatched vintage china, curated per event, cleaned and delivered.', icon: '\ud83c\udf7d\ufe0f', price: 'From $8/setting', category: 'tableware-rentals', supplierName: 'Heirloom Table Co.', supplierRating: 4.8, supplierReviews: 29, location: 'Portland, OR' , supplierUrl: 'https://www.heirloomtableco.com' },
  { id: 'p9', title: 'Farmhouse Table & Linen Rental', description: 'Long-format wood tables with linen included, delivered and set up.', icon: '\ud83e\ude91', price: 'From $45/table', category: 'tableware-rentals', supplierName: 'Heirloom Table Co.', supplierRating: 4.8, supplierReviews: 29, location: 'Portland, OR' , supplierUrl: 'https://www.heirloomtableco.com' },
  { id: 'p10', title: 'Artisan Cheese & Charcuterie Board', description: 'Grazing-table style spread, built and refreshed on-site through the event.', icon: '\ud83e\uddc0', price: 'From $12/guest', category: 'specialty-food-stations', supplierName: 'The Grazing Table Co.', supplierRating: 4.9, supplierReviews: 54, location: 'Milwaukie, OR' , supplierUrl: 'https://www.thegrazingtableco.com' },
  { id: 'p11', title: 'Live Wood-Fired Pizza Station', description: 'A working wood-fired oven on-site, chef-staffed, made to order.', icon: '\ud83c\udf55', price: 'From $16/guest', category: 'specialty-food-stations', supplierName: 'Neapolitan Fire Co.', supplierRating: 4.8, supplierReviews: 33, location: 'Portland, OR' , supplierUrl: 'https://www.neapolitanfireco.com' },
  { id: 'p12', title: 'Live Acoustic Duo', description: 'Two-piece acoustic set for ceremony, cocktail hour, or dinner background.', icon: '\ud83c\udfb6', price: 'From $650/event', category: 'entertainment-experiences', supplierName: 'Portland Sound Collective', supplierRating: 4.9, supplierReviews: 47, location: 'Portland, OR' , supplierUrl: 'https://www.portlandsoundcollective.com' },
  { id: 'p13', title: 'DJ & Sound System', description: 'Full reception DJ set with a professional sound system included.', icon: '\ud83c\udfa7', price: 'From $800/event', category: 'entertainment-experiences', supplierName: 'Portland Sound Collective', supplierRating: 4.9, supplierReviews: 47, location: 'Portland, OR' , supplierUrl: 'https://www.portlandsoundcollective.com' },
  { id: 'p14', title: 'Event Photography (4 hrs)', description: 'Candid and posed coverage, edited gallery delivered within two weeks.', icon: '\ud83d\udcf8', price: 'From $600', category: 'photography-media', supplierName: 'Golden Hour Studio', supplierRating: 5.0, supplierReviews: 89, location: 'Portland, OR' , supplierUrl: 'https://www.goldenhourstudio.com' },
  { id: 'p15', title: 'Same-Day Photo Booth', description: 'Open-air booth with instant prints and a digital gallery for guests.', icon: '\ud83d\udcf7', price: 'From $350', category: 'photography-media', supplierName: 'Golden Hour Studio', supplierRating: 5.0, supplierReviews: 89, location: 'Portland, OR' , supplierUrl: 'https://www.goldenhourstudio.com' },
  { id: 'p16', title: 'Local Honey Favor Jars', description: 'Small-batch local honey in labeled jars, a take-home favor guests keep.', icon: '\ud83c\udf6f', price: 'From $5/guest', category: 'favors-gifting', supplierName: 'Little Jar Co.', supplierRating: 4.7, supplierReviews: 22, location: 'Hillsboro, OR' , supplierUrl: 'https://www.littlejarco.com' },
  { id: 'p17', title: 'Professional Serving Staff', description: 'Trained servers for plated or buffet-style service, booked by the hour.', icon: '\ud83e\uddd1\u200d\ud83c\udf73', price: 'From $35/hr', category: 'staffing-service', supplierName: 'Northwest Event Staffing', supplierRating: 4.8, supplierReviews: 40, location: 'Portland, OR' , supplierUrl: 'https://www.nweventstaffing.com' },
  { id: 'p18', title: 'Delivery & Setup Coordination', description: 'One point of contact to coordinate delivery timing across your other suppliers.', icon: '\ud83d\ude9a', price: 'From $150/event', category: 'logistics-venue-support', supplierName: 'Cascade Event Logistics', supplierRating: 4.6, supplierReviews: 18, location: 'Portland, OR' , supplierUrl: 'https://www.cascadeeventlogistics.com' },
] as const;
