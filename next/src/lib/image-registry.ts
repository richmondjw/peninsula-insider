import imageRegistry from '../data/image-registry.json';

export interface RegistryHero {
  src: string;
  alt: string;
  credit?: string | null;
  license?: string | null;
  fieldPath?: string;
  source?: string;
  kind?: string;
  hasOwnPhoto?: boolean;
  duplicateGroup?: string;
  duplicateCount?: number;
  missingLocalFile?: boolean;
}

export interface RegistryEntity {
  entityType: string;
  slug: string;
  title: string;
  canonicalHero: RegistryHero;
  originalHero?: RegistryHero | null;
  override?: RegistryHero | null;
}

type RegistryData = {
  entities?: Record<string, RegistryEntity>;
};

const registry = imageRegistry as RegistryData;

export function imageRegistryKey(entityType: string, slug: string): string {
  return `${entityType}/${slug}`;
}

export function getRegisteredEntity(entityType: string, slug: string): RegistryEntity | undefined {
  return registry.entities?.[imageRegistryKey(entityType, slug)];
}

export function getRegisteredHero(entityType: string, slug: string): RegistryHero | undefined {
  return getRegisteredEntity(entityType, slug)?.canonicalHero;
}

export function registeredHeroImageJson(entityType: string, slug: string): {
  src: string;
  alt: string;
  credit?: string | null;
  license?: string | null;
} | null {
  const hero = getRegisteredHero(entityType, slug);
  if (!hero?.src) return null;
  return {
    src: hero.src,
    alt: hero.alt ?? '',
    credit: hero.credit ?? null,
    license: hero.license ?? null,
  };
}
