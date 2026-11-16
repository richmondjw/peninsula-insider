/** Short, complete summaries based on each entry's existing editorial note.
 * Never infer access, amenities or current conditions from a missing field. */
const summaries = {
  'arthurs-seat-lookout': 'Start with the bay views, then choose a summit walk. Check the Eagle separately if you want the gondola ride.',
  'ashcombe-maze': 'Wander the hedge maze and gardens, then stop at the café. Check opening days before setting out.',
  'balnarring-beach': 'Choose a Western Port beach outing from Balnarring. Check local beach conditions and rules before your visit.',
  'bushrangers-bay-walk': 'Walk through coastal scrub to the bay; allow for the climb on the return. Check the park’s current track notices.',
  'bushrangers-bay': 'An ocean-coast outing reached on foot. Plan the return walk and check park notices before heading to the beach.',
  'cape-schanck-boardwalk': 'A shorter coastal stop for basalt formations and lighthouse views. Check current access before choosing the boardwalk.',
  'cape-schanck-lighthouse-walk': 'Follow the lighthouse headland for Bass Strait views. Check track access and choose a section that suits your party.',
  'coastal-walk-cape-schanck': 'Choose a section of the long coastal traverse. Check closures and arrange return transport for a one-way walk.',
  'coppins-track': 'Coastal heath, clifftop views and interpretive signs on the way towards Diamond Bay. Plan the return before setting out.',
  'dromana-beach': 'Pair the bay foreshore with a stop in Dromana’s town strip. Check beach conditions before entering the water.',
  'eagle-ridge-golf-course': 'Choose a parkland round among gum trees and dams. Check tee times and visitor arrangements with the course.',
  'farnsworth-track': 'A clifftop walk between the Portsea ocean coast and London Bridge. Check park notices and plan your return route.',
  'flinders-golf-club': 'A coastal golf outing above Flinders. Check visitor tee times with the club before planning the rest of the day.',
  'greens-bush-two-bays-section': 'Choose bushland and birdlife over the beach. This is a longer walking commitment; check route details and return transport.',
  'gunnamatta-ocean-beach': 'Go for the open coastline and surf views. Check beach conditions and patrol information before deciding how to use the beach.',
  'montalto-sculpture-trail': 'Walk through sculpture, vineyard and gardens before or after a meal. Confirm trail access and restaurant bookings separately.',
  'moonah-links': 'Make golf the centre of the stay, with two courses at the resort. Compare course choice and tee-time availability directly.',
  'mornington-foreshore-walk': 'Build a Mornington outing around the foreshore walk. Read the route details before choosing your starting point.',
  'mornington-golf-club': 'A parkland round to pair with a Mornington stay. Confirm visitor access and available tee times before travelling.',
  'mornington-peninsula-gallery': 'Make the current exhibition the reason to visit. Check the gallery program and opening days before planning an indoor afternoon.',
  'mount-martha-beach': 'A bay-coast stop with bathing boxes and the village nearby. Check beach conditions rather than assuming calm water.',
  'point-nepean-fort-walk': 'Combine coastal views with the fort’s military history. Choose your route and check park access before leaving Sorrento.',
  'point-nepean-national-park': 'Give the park a substantial part of the day. Check current walking, cycling and shuttle options with Parks Victoria.',
  'portsea-front-beach': 'A small bay-side beach near the pier and village. Check current beach access and conditions before your visit.',
  'portsea-golf-club': 'A golf outing at the Peninsula’s tip. Confirm the club’s current visitor arrangements before building a day around a round.',
  'pt-leo-sculpture-park': 'An outdoor sculpture outing across the estate’s lawns and gardens. Check admission and forecast, and book dining separately.',
  'racv-cape-schanck-golf-course': 'Combine a resort round with a Cape Schanck stay. Check tee times and the conditions expected for your booking.',
  'red-hill-hinterland-cycling': 'Explore the ridge by bike with a route suited to your group. Check hire, terrain and return arrangements before committing.',
  'red-hill-truffles': 'A seasonal truffle-hunt outing with working dogs. Check the operator’s current dates and book before travelling.',
  'rosebud-country-club': 'A golf option for a central Peninsula base. Ask the club about course choice and visitor tee times.',
  'rye-ocean-beach': 'Choose the ocean side for a coastal outing. Check current conditions and patrol information before entering the water.',
  'safety-beach-foreshore': 'A bay foreshore outing to pair with a local meal. Check actual water conditions; the name is not a safety assessment.',
  'sea-search-encounters': 'A guided snorkelling or scuba outing from Sorrento. Confirm the trip, swimming requirements and weather arrangements with the operator.',
  'sorrento-back-beach': 'Pick the ocean side for a walk and coastal views. Check conditions and patrol information before considering a swim.',
  'sorrento-ferry': 'Cross the bay to Queenscliff as a foot passenger or with a vehicle. Check sailings and the return crossing before booking.',
  'sorrento-golf-club': 'A parkland round near a Sorrento base. Confirm visitor tee times and member-priority restrictions with the club.',
  'sorrento-ocean-baths': 'Read the access and conditions advice before planning this rock-pool stop. Tide alone does not establish suitable swimming conditions.',
  'st-andrews-beach-golf-course': 'Make the dune-course round the day’s anchor. Book a tee time and allow for the coastal forecast.',
  'summit-circuit-arthurs-seat': 'A summit loop through gardens and viewpoints. Check the route and access details before choosing it for your party.',
  'sunny-ridge-strawberry-farm': 'Plan around the current picking season. Confirm fruit availability and opening days with the farm before driving to the ridge.',
  'the-dunes-golf-links': 'A links-style golf outing in the southern Peninsula. Check course choice, visitor tee times and the coastal forecast.',
  'the-national-golf-club': 'A private-club golf option. Establish your access arrangements and the correct course location before planning the trip.',
  'two-bays-walking-track': 'A long one-way route between the bay and Cape Schanck. Choose a section or plan a full walking day with return transport.',
};

export function exploreSummary(slug, data) {
  if (summaries[slug]) return summaries[slug];
  // Complete existing short copy may survive; longer prose is never cut into a fragment.
  for (const text of [data.signature, data.whyWeGo]) {
    if (typeof text === 'string' && text.trim().split(/\s+/).length <= 25) return text.trim();
  }
  if (data.type === 'market') return 'Check the next market date and location before travelling; individual stall line-ups can change.';
  if (data.type === 'spa') return 'Choose your treatment or bathing session, then check the operator’s current booking and access information.';
  return 'Read the visit details, then check current opening and access information before travelling.';
}

export function effortLabel(data) {
  // A walk grading is not a mobility-access claim and should not label a gallery or beach.
  if (data.type !== 'walk' || !['easy', 'moderate', 'hard'].includes(data.difficulty)) return undefined;
  return `${data.difficulty[0].toUpperCase()}${data.difficulty.slice(1)} walk`;
}
