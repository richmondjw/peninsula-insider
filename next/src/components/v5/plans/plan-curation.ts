/** Editorial choices for the plans hub, grounded in each published stop list.
 * A priority is a recommendation order, never a recency or partner score.
 * Practical notes are planning advice, not a new claim of venue verification.
 */
export interface PlanCuration {
  displayTitle: string;
  editorialReason: string;
  editorialPriority: number;
  pace?: string;
  bookingNote?: string;
}

const ITINERARY_CURATION: Record<string, PlanCuration> = {
  'ridge-to-sea-two-night-escape': {
    displayTitle: 'Ridge to sea',
    editorialReason: 'Our starting point for a first weekend: vineyard lunches, a coastal walk and Point Nepean, with a different base each night.',
    editorialPriority: 100,
    bookingNote: 'Book both stays and your lunches. Check the Red Hill Market date before including that stop.',
  },
  'flinders-and-cape-reset': {
    displayTitle: 'Flinders and the Cape',
    editorialReason: 'A shorter escape with one village base, two coastal walks and time set aside for the meals.',
    editorialPriority: 90,
    bookingNote: 'Check the stay and restaurant service times first, then fit the walks around your reservations.',
  },
  'the-family-day-out': {
    displayTitle: 'The family day out',
    editorialReason: 'One gondola ride, one lunch and a bay beach. The final coffee stop can go if the children have had enough.',
    editorialPriority: 85,
    bookingNote: 'Check Eagle tickets, lunch service and the final cafe opening time for your chosen day.',
  },
  'sorrento-off-season-weekend': {
    displayTitle: 'Sorrento, off season',
    editorialReason: 'Use Sorrento as your base for the back beach and Point Nepean. The second dinner is a drive out to Pt. Leo.',
    editorialPriority: 80,
    bookingNote: 'Book the stay and both dinners. Allow for the Pt. Leo return drive and check park access before setting out.',
  },
  'wellness-weekend': {
    displayTitle: 'The wellness weekend',
    editorialReason: 'Two nights in the same place, a thermal session and a gallery on the way home. Keep the coastal walk optional.',
    editorialPriority: 75,
    bookingNote: 'Book the stay and thermal session first, then check meal service times and cancellation terms.',
  },
  'the-peninsula-golf-weekend': {
    displayTitle: 'The golf weekend',
    editorialReason: 'One round at St Andrews Beach, with vineyard meals and an optional coastal walk for the rest of the group.',
    editorialPriority: 60,
    bookingNote: 'Check tee-time availability and book the stay and group meals before committing to the weekend.',
  },
};

const GUIDE_TITLES: Record<string, string> = {
  'corporate-events-how-to-plan-peninsula-retreat': 'Plan a corporate retreat',
  'how-to-build-a-red-hill-saturday': 'A Red Hill Saturday',
  'how-to-plan-a-peninsula-weekend': 'How to plan your weekend',
  'mornington-day-guide': 'A day in Mornington',
  'mornington-peninsula-golf-stay-and-play': 'Where to stay for golf',
  'mornington-peninsula-stay-and-soak': 'Where to stay for the springs',
  'the-birthday-weekend': 'The birthday weekend',
  'the-couples-weekend': 'The couples weekend',
  'the-easter-peninsula': 'The Easter long weekend',
  'the-four-hour-peninsula': 'Four hours on the Peninsula',
  'the-friday-night-arrival': 'Arriving on Friday night',
  'the-market-saturday': 'The market Saturday',
  'the-one-booking-peninsula-day': 'The one-booking day',
  'the-one-night-escape': 'Making one night count',
  'the-peninsula-orientation-drive': 'The orientation drive',
  'the-peninsula-picnic': 'The Peninsula picnic',
  'the-point-nepean-half-day': 'Half a day at Point Nepean',
  'the-producer-trail': 'The producer trail',
  'the-pub-crawl': 'Three Peninsula pub routes',
  'the-school-holidays-survival-guide': 'The school holidays guide',
  'the-sorrento-off-season-weekend-2026-w33': 'A quieter Sorrento weekend',
  'the-thermal-springs-weekend': 'Planning a springs weekend',
  'walks-cape-schanck-hot-springs-day': 'Cape Schanck, then the springs',
  'weddings-mornington-peninsula-weekend-planning': 'Plan a wedding weekend',
};

export function planCuration(slug: string, title: string, kind: 'itinerary' | 'guide'): PlanCuration {
  if (kind === 'itinerary' && ITINERARY_CURATION[slug]) return { ...ITINERARY_CURATION[slug] };
  return {
    displayTitle: (kind === 'guide' && GUIDE_TITLES[slug]) || title,
    editorialReason: kind === 'guide'
      ? 'Planning advice to read and adapt. This guide does not include a ready-made stop list.'
      : 'A published itinerary with its stops arranged by day.',
    editorialPriority: 0,
  };
}

/** Keep the editor's sequence stable when a publishing date changes. */
export function compareEditorialPlans(
  a: { kind: 'itinerary' | 'guide'; editorialPriority: number; title: string },
  b: { kind: 'itinerary' | 'guide'; editorialPriority: number; title: string },
): number {
  return Number(b.kind === 'itinerary') - Number(a.kind === 'itinerary')
    || b.editorialPriority - a.editorialPriority
    || a.title.localeCompare(b.title, 'en-AU');
}
