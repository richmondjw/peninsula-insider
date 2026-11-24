/**
 * The towns the site leads with, in editorial priority order (not alphabetical,
 * not by region). Reflects search importance, Peninsula recognition and
 * editorial strength.
 *
 * One list, two surfaces: the Towns hub (/explore/places/) shows all of them
 * first, and the Explore hub (/explore/) builds its "Start with a town" rail
 * from the front of it. Change the order here and both follow.
 *
 * Fingal is here for Peninsula Hot Springs, Moonah Links and Cape Schanck
 * access; Dromana for the drive-in, the Arthurs Seat Eagle and its gateway
 * position.
 */
export const FEATURED_TOWNS: string[] = [
  'sorrento', 'red-hill', 'flinders', 'portsea', 'mornington',
  'cape-schanck', 'fingal', 'dromana', 'main-ridge', 'merricks',
  'blairgowrie', 'rye',
];
