import type { PageImage } from './page-images';
const subjects: Record<string, string> = {
 eat: 'Oversized coral coffee cup and a lemon beside the teal bay',
 stay: 'Striped lounge chair and a sunhat beside the teal bay',
 wine: 'Oversized wine glass above simplified vineyard hills',
 explore: 'A winding coastal path through bold teal headlands',
 'whats-on': 'Striped market canopy and brightly coloured produce',
};
export function categoryHero(key: string): PageImage {
 if (!subjects[key]) throw new Error(`Unknown category illustration: ${key}`);
 return {page: key, role: 'category-hero', entity: key,
 src: `/images/generated/category-${key}-coastal-punch.webp`,
 alt: `${subjects[key]}. Conceptual Coastal Punch illustration.`,
 caption: 'Conceptual coastal illustration.', credit: 'AI-assisted artwork by Peninsula Insider',
 depictionStatus: 'illustrative', creator: 'Peninsula Insider with OpenAI image generation',
 rights: 'Original user-authorized AI-assisted output', permission: 'Website publication approved by James',
 };
}
