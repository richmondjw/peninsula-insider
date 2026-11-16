// Keep the complete provenance record with the selected photograph.
export function reviewedCellarPhoto(data) {
  return [data.heroImage, ...(data.gallery ?? [])].find(i =>
    i?.depictionStatus === 'actual' && i.provenanceReview === 'verified' &&
    i.rightsStatus === 'recorded' && i.permittedUses?.includes('website') &&
    i.src?.startsWith('/images/') && i.alt?.trim() && i.credit?.trim() &&
    i.sourceUrl && i.permission && i.license);
}
export function resolveCellarHero(guide,venues){
 const venue=venues.find(v=>v.data.slug===guide.hero.venueSlug);
 const photo=venue&&reviewedCellarPhoto(venue.data);
 if(!photo)throw new Error('Guide hero needs a reviewed actual venue photo');
 return {venue,photo,caption:`${venue.data.name}. ${guide.hero.note}`};
}
