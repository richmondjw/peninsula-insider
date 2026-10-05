// Direct club visitor sources shared by the golf hub and course details.
// This check covers visitor access only; full course records have separate verification dates.
export type GolfVisitorInfo = { url: string; summary: string; teeTimes?: boolean; linkLabel?: string; detailActionLabel?: string; detailSourceActionLabel?: string };
export const golfVisitorAccessChecked = '5 Oct 2026';

export const golfVisitorInfo: Record<string, GolfVisitorInfo> = {
  'the-national-golf-club': {
    detailActionLabel: 'Read visitor eligibility',
    url: 'https://nationalgolf.com.au/visitors/',
    summary: 'Victorian nonmembers need a member invitation; interstate and overseas visitors can request tee times.',
  },
  'flinders-golf-club': {
    detailActionLabel: 'Visitor fees and availability',
    url: 'https://www.flindersgolfclub.com.au/cms/visitors-and-social-groups/fees-availability/',
    summary: 'Visitor competition windows and green-fee options are published by the club.',
  },
  'mornington-golf-club': {
    detailActionLabel: 'Public golf and bookings',
    url: 'https://www.morningtongolf.com.au/cms/golf/public-golf/',
    summary: 'Green-fee visitors are welcome; tee-time bookings are essential.',
  },
  'sorrento-golf-club': {
    detailActionLabel: 'Read visitor rules',
    url: 'https://sorrentogolf.com.au/visitors/',
    summary: 'Limited visitor times; no visitor play from Boxing Day to the end of January.',
  },
  'moonah-links': {
    url: 'https://www.moonahlinks.com.au/cms/golf/book-golf/',
    summary: 'Public players register online before viewing tee times for Open and Legends.',
    teeTimes: true,
  },
  'st-andrews-beach-golf-course': {
    url: 'https://standrewsbeachgolf.com.au/',
    summary: 'Fully public, seven days; tee times and current fees are published by the club.',
    teeTimes: true,
  },
  'racv-cape-schanck-golf-course': {
    url: 'https://www.racv.com.au/travel-experiences/resorts/cape-schanck/golf.html',
    summary: 'Member and standard green fees; check current tee times and book online.',
    teeTimes: true,
  },
  'eagle-ridge-golf-course': {
    url: 'https://eagleridge.com.au/',
    summary: 'Public online booking through the club-linked tee-time service.',
    teeTimes: true,
  },
  'the-dunes-golf-links': {
    detailSourceActionLabel: 'Compare course rates',
    url: 'https://thedunes.com.au/golf/prices-and-information-golf-rye/',
    summary: "Compare the club's separate main-course and Cups rates before booking.",
    teeTimes: true,
  },
  'rosebud-country-club': {
    url: 'https://rosebudcountryclub.com.au/web/pages/play-golf',
    summary: 'Public bookings for North and South; check current tee times with the club.',
    teeTimes: true,
  },
  'portsea-golf-club': {
    detailActionLabel: 'Visitor times and booking',
    url: 'https://portsea.miclub.com.au/cms/public-bookings/',
    summary: 'Visitor windows vary with member play. Check the live booking calendar or call the pro shop for the date and any eligibility rules.',
    linkLabel: 'Visitor times and booking',
  },
};
