/**
 * Thin React wrapper around @sanity/visual-editing's VisualEditing component.
 * Rendered client:only="react" from SanityVisualEditing.astro so it only
 * runs in the browser, never on the server.
 */
import {VisualEditing} from '@sanity/visual-editing/react'

export default function SanityVisualEditingReact() {
  return <VisualEditing />
}
