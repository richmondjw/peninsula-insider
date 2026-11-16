# Peninsula Insider anchor-page design rules

Applies to Home, Eat & Drink, Stay, Wine, Explore, Plans, What's On and Journal. These pages may tell different stories, but they belong to one product. Use `v6-tokens.css` and shared components; page-local styles must not introduce a third font, unrelated palette or arbitrary control language.

## Typography and hierarchy

- Sora for wordmark, h1, h2 and h3. Figtree for prose, navigation, controls, captions and metadata. Legacy editorial/serif aliases resolve to these families, never to Georgia, Inter or another page-specific font.
- One h1: the page's offer, with a brief standfirst and a useful next action. Anchor titles use `--fs-800` (48px) on desktop and 32px on mobile, balanced lines and negative display tracking. The homepage cover has a larger display scale because it is the site's welcome. Section headings use 32px on desktop and at most 28px on mobile; the compact mobile finder uses 24px. Card headings use `--fs-600` or the compact-row scale.
- Body text defaults to 17px. Secondary text and captions may use 15px, metadata 13px, and uppercase short labels 12px. Avoid tiny editorial text that forces mobile readers to zoom.
- Use the shared space scale, 68ch prose measure and consistent container width. Content hierarchy comes from scale, weight and space rather than switching font families.

## Colour, imagery and composition

- Harbour blue carries links, selected states and primary actions; deep navy carries dark sections; white and warm neutral carry reading surfaces. Sand is a restrained accent, with the AA-safe sand-text token on white.
- Every image has subject, rights and descriptive alt evidence. A contextual photo identifies the actual photographed place; an illustration is disclosed. No generic coastal photo may silently stand in as a venue photograph.
- Use stable image dimensions and deliberate 3:2 or 16:9 crops. Avoid giant empty plates paired with tiny unrelated thumbnails. A photo cannot carry the only text or action.
- Use a consistent section rhythm and a small family of card types. Editorial curation, practical discovery and deeper stories are recognisable layers rather than competing modules.

## Interaction and mobile

- Entry pages offer one clear primary discovery path, an editorial route and a map/context route. A person looking for a cafe should not need to read a restaurant feature first.
- Keep one filter state, truthful counts, URL/history restoration and one polite status region. Labels describe the result of an action; Save and Add to trip retain their site-wide meaning.
- Controls have visible labels, at least 44px touch targets and visible keyboard focus. Native selects are preferred over bespoke dropdowns. Dialogs contain focus, close on Escape and return focus to their opener.
- Mobile is checked at 390px with the first-visit cookie note. Primary choices remain reachable in the first screen, no horizontal page scroll or sticky overlap. Reduced-motion preferences are respected.
- Progressive browsing must retain every result in the generated HTML, disclose how many are shown and provide an obvious route to the rest. No-script readers can reach the full list.

## Enforcement and acceptance

Rendered anchor-page checks compare actual fonts, headings, focus, overflow and first-screen actions. Include shared header controls, footer prose/headings and the open mobile menu on every anchor, with soft navigation and Escape focus return. Shared chrome uses the publication tokens and must not import legacy font files for its own text. Shared typography changes are reviewed across every anchor and client navigation. The page-quality rubric and iteration log retain deductions; automated checks alone cannot certify 99/100. Factual, image-rights, accessibility and task failures block release.
