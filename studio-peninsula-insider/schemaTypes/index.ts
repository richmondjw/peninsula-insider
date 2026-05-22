import {imageRef} from './objects/imageRef'
import {coordinates} from './objects/coordinates'
import {authority} from './objects/authority'
import {tags} from './objects/tags'
import {openingHourEntry} from './objects/openingHourEntry'
import {visiting} from './objects/visiting'
import {wines} from './objects/wines'
import {onSiteFood} from './objects/onSiteFood'
import {faqItem} from './objects/faqItem'
import {sameAs} from './objects/sameAs'
import {itineraryStop} from './objects/itineraryStop'
import {
  alertBlock, practicalCallout, cellarDoorList,
  dogPolicyTable, subregionGrid, varietyGuide,
} from './objects/embedBlocks'
import {place} from './documents/place'
import {venue} from './documents/venue'
import {itinerary} from './documents/itinerary'
import {experience} from './documents/experience'
import {tourOperator} from './documents/tourOperator'
import {tour} from './documents/tour'
import {tourPackage} from './documents/tourPackage'
import {author} from './documents/author'
import {article} from './documents/article'
import {event} from './documents/event'
import {siteSettings} from './documents/siteSettings'
import {homepageCover} from './documents/homepageCover'
import {megaRail} from './documents/megaRail'
import {pageHero} from './documents/pageHero'

export const schemaTypes = [
  // Reusable object types — registered first so documents can reference them.
  imageRef,
  coordinates,
  authority,
  tags,
  openingHourEntry,
  visiting,
  wines,
  onSiteFood,
  faqItem,
  sameAs,
  itineraryStop,
  alertBlock,
  practicalCallout,
  cellarDoorList,
  dogPolicyTable,
  subregionGrid,
  varietyGuide,

  // Document types.
  place,
  venue,
  itinerary,
  experience,
  tourOperator,
  tour,
  tourPackage,
  author,
  article,
  event,
  siteSettings,
  homepageCover,
  megaRail,
  pageHero,
]
