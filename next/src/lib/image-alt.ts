// Descriptions checked against the actual photos during the September 2026
// SEO repair. Match the source path, never the page name: a CMS replacement
// must not inherit a description of the previous photograph.
const descriptions: Record<string, string> = {
  '/storage/v1/object/public/cms-assets/page/eat/hero-1781253386089.jpg': 'Outdoor dining terraces and gardens beside a vineyard restaurant',
  '/storage/v1/object/public/cms-assets/page/stay/hero-1781253660788.jpg': 'Armchairs and a small table beside a wide window in a warm-toned guest room',
  '/images/sourced/article-cellar-door-01.webp': 'Bunches of dark grapes ripening among green vine leaves',
  '/images/sourced/explore-cape-schanck-lighthouse-01.webp': 'Cape Schanck Lighthouse lit against a darkening sky',
  '/images/sourced/journal-hub-hero-01.webp': 'Cape Schanck Lighthouse above coastal scrub and the open sea',
  '/storage/v1/object/public/cms-assets/page/dog-friendly/hero-1780280250343.jpg': 'A brown dog running through shallow surf on a sandy beach',
  '/images/sourced/explore-portsea-front-beach-01.webp': 'Swimmers in calm bay water beside a timber jetty',
  '/storage/v1/object/public/cms-assets/page/weddings/hero-1786238590623.jpg': 'A wedding couple on a tree-lined driveway outside a white country venue',
  '/storage/v1/object/public/cms-assets/page/boating/hero-1779055702738.jpg': 'View along the deck of a sailing yacht under sail on the bay',
  '/storage/v1/object/public/cms-assets/page/tour/hero-1786330991128.jpg': 'A touring van parked beside vineyard rows with hills in the distance',
  '/images/sourced/venue-jackalope-hotel-01.webp': 'Tables and timber chairs in a dining room with tall windows and hanging lights',
  '/storage/v1/object/public/cms-assets/page/editorial-approach/hero-1783824214967.jpg': 'Four paddleboarders crossing clear water beside a sandy, tree-lined shore',
  '/images/sourced/home-cover-back-beach-horses-01.jpg': 'Waves breaking along a sandy beach below rugged coastal cliffs',
  '/images/sourced/article-vineyard-villa-01.webp': 'Rows of golden vines below a wooded ridge',
  '/images/sourced/dog-beach-emma-01.webp': 'Visitors exploring rock pools on a broad ocean beach',
  '/images/sourced/wine-hub-hero-01.webp': 'Bunches of dark grapes ripening among green vine leaves',
  '/images/sourced/venue-italian-dining-01.webp': 'Diners seated around tables viewed from above in a busy restaurant',
};

export function knownImageAlt(src?: string): string {
  if (!src) return '';
  try { return descriptions[new URL(src, 'https://peninsulainsider.com.au').pathname] || ''; }
  catch { return ''; }
}
