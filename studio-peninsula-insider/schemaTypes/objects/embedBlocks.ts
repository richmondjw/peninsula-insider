import {defineType, defineField} from 'sanity'

/**
 * Custom Portable Text block types that mirror the MDX components used
 * in Peninsula Insider's article bodies. Editors get a dedicated panel
 * for each embed; the Astro side renders them via the existing
 * <AlertBlock>, <CellarDoorList>, etc. components.
 *
 * Six components recovered from the 20 .mdx articles:
 *   - AlertBlock         { type: 'danger'|'warning'|'info', heading, body }
 *   - PracticalCallout   { variant?: string, eyebrow, heading, body }
 *   - CellarDoorList     { items: [{ name, ... }] }
 *   - DogPolicyTable     { rows: [{ name, policy, ... }] }
 *   - SubregionGrid      { items: [{ name, ... }] }
 *   - VarietyGuide       { items: [{ variety, notes, ... }] }
 *
 * For items-array embeds we keep `props` as JSON for now (one shape
 * field per editor would explode); editors can refine the props after
 * cutover. Plain-text embeds (Alert, PracticalCallout) get structured
 * fields immediately.
 */

export const alertBlock = defineType({
  name: 'alertBlock',
  title: 'Alert',
  type: 'object',
  fields: [
    defineField({
      name: 'level',
      title: 'Level',
      type: 'string',
      options: {list: ['danger', 'warning', 'info'].map((v) => ({title: v, value: v}))},
      initialValue: 'info',
      validation: (R) => R.required(),
    }),
    defineField({name: 'heading', title: 'Heading', type: 'string', validation: (R) => R.required()}),
    defineField({name: 'body', title: 'Body', type: 'text', rows: 4}),
  ],
  preview: {select: {title: 'heading', subtitle: 'level'}},
})

export const practicalCallout = defineType({
  name: 'practicalCallout',
  title: 'Practical callout',
  type: 'object',
  fields: [
    defineField({name: 'variant', title: 'Variant', type: 'string'}),
    defineField({name: 'eyebrow', title: 'Eyebrow', type: 'string'}),
    defineField({name: 'heading', title: 'Heading', type: 'string', validation: (R) => R.required()}),
    defineField({name: 'body', title: 'Body', type: 'text', rows: 5}),
  ],
  preview: {select: {title: 'heading', subtitle: 'eyebrow'}},
})

export const cellarDoorList = defineType({
  name: 'cellarDoorList',
  title: 'Cellar door list',
  type: 'object',
  fields: [
    defineField({
      name: 'itemsJson',
      title: 'Items (JSON)',
      type: 'text',
      rows: 10,
      description: 'Array of {name, …} objects as JSON. Migrated as-is from MDX.',
    }),
  ],
  preview: {prepare: () => ({title: 'Cellar door list'})},
})

export const dogPolicyTable = defineType({
  name: 'dogPolicyTable',
  title: 'Dog policy table',
  type: 'object',
  fields: [
    defineField({
      name: 'rowsJson', title: 'Rows (JSON)', type: 'text', rows: 10,
      description: 'Array of policy rows as JSON.',
    }),
  ],
  preview: {prepare: () => ({title: 'Dog policy table'})},
})

export const subregionGrid = defineType({
  name: 'subregionGrid',
  title: 'Subregion grid',
  type: 'object',
  fields: [
    defineField({name: 'itemsJson', title: 'Items (JSON)', type: 'text', rows: 10}),
  ],
  preview: {prepare: () => ({title: 'Subregion grid'})},
})

export const varietyGuide = defineType({
  name: 'varietyGuide',
  title: 'Variety guide',
  type: 'object',
  fields: [
    defineField({name: 'itemsJson', title: 'Items (JSON)', type: 'text', rows: 10}),
  ],
  preview: {prepare: () => ({title: 'Variety guide'})},
})
