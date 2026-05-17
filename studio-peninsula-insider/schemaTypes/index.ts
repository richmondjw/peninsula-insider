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
import {place} from './documents/place'
import {venue} from './documents/venue'

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

  // Document types.
  place,
  venue,
]
