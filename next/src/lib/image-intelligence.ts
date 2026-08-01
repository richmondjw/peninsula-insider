import index from '../data/image-intelligence-search-index.json';

export type AssetSearchFilters = { orientation?: string; noPeople?: boolean };
type SearchAsset = {
  assetId: string;
  canonicalUri: string;
  rightsStatus: string;
  metadataState: string;
  taxonomy: string[];
  altText: string | null;
  caption: string | null;
  orientation: string | null;
  entitySlugs: string[];
};
const assets = index.assets as SearchAsset[];

export function searchApprovedImages(query: string, filters: AssetSearchFilters = {}) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return assets
    .filter((asset) => asset.metadataState === 'approved' && asset.rightsStatus === 'known')
    .filter((asset) => !filters.orientation || asset.orientation === filters.orientation)
    .filter((asset) => !filters.noPeople || !asset.taxonomy.some((id) => id.startsWith('people.') && id !== 'people.none'))
    .map((asset) => {
      const text = [asset.altText, asset.caption, ...asset.taxonomy, ...asset.entitySlugs].join(' ').toLowerCase();
      return { ...asset, relevance: terms.reduce((score, term) => score + Number(text.includes(term)), 0) };
    })
    .filter((asset) => !terms.length || asset.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance);
}

export function approvedImageByAssetId(assetId: string) {
  return assets.find((asset) => asset.assetId === assetId && asset.metadataState === 'approved' && asset.rightsStatus === 'known') ?? null;
}
