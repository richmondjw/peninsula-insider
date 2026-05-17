import {imageRef} from './objects/imageRef'
import {coordinates} from './objects/coordinates'
import {authority} from './objects/authority'
import {tags} from './objects/tags'
import {place} from './documents/place'
import {venue} from './documents/venue'

export const schemaTypes = [
  // Reusable object types — registered first so documents can reference them.
  imageRef,
  coordinates,
  authority,
  tags,

  // Document types.
  place,
  venue,
]
