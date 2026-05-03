# Site copy pass — 2026-05-02

## Files changed

### Cadence / evergreen newsletter timing cleanup
- `next/src/components/WeekendPickerBlock.astro`
  - Updated internal cadence comment from Sunday-evening wording to weekly editorial rhythm wording.
- `next/src/components/NewsletterBlock.astro`
  - Updated newsletter success state copy to: `You're in. The next edition will land in your inbox soon.`
- `next/src/pages/corporate-events/best-corporate-retreat-venues-mornington-peninsula.astro`
  - Changed `dispatches every Sunday for the weekend ahead` to `dispatches weekly for the weekend ahead`.
- `next/src/pages/corporate-events/index.astro`
  - Changed `dispatches every Sunday for the weekend ahead` to `dispatches weekly for the weekend ahead`.
- `next/src/pages/spa/index.astro`
  - Changed `dispatches every Sunday for the weekend ahead` to `dispatches weekly for the weekend ahead`.
- `next/src/pages/walks/easy-walks-mornington-peninsula.astro`
  - Changed `dispatches every Sunday for the weekend ahead` to `dispatches weekly for the weekend ahead`.
- `next/src/pages/walks/index.astro`
  - Changed `dispatches every Sunday for the weekend ahead` to `dispatches weekly for the weekend ahead`.
- `next/src/pages/weddings/index.astro`
  - Changed `dispatches every Sunday for the weekend ahead` to `dispatches weekly for the weekend ahead`.
- `next/src/pages/weddings/winery-wedding-venues-mornington-peninsula.astro`
  - Changed `dispatches every Sunday for the weekend ahead` to `dispatches weekly for the weekend ahead`.
- `next/src/pages/journal/index.astro`
  - Changed Weekend Picker cadence copy from `every Sunday` to `published weekly for the weekend ahead`.
- `next/src/pages/v2-staging/about.astro`
  - Rewrote Wednesday-specific newsletter/publishing copy to weekly wording.
- `next/src/pages/v2-staging/index.astro`
  - Replaced `Wednesday 6 pm` cadence label with `Weekly`.
  - Rewrote homepage newsletter arrival copy to `land in your inbox soon`.
- `next/src/pages/v2-staging/journal/index.astro`
  - Changed `Our Wednesday 6pm...` wording to `Our weekly...`.
- `next/src/pages/v2-staging/newsletter.astro`
  - Replaced Wednesday / 6 pm cadence references with weekly wording across dispatch label, title text, intro copy, and shortlist explainer.
- `next/src/pages/v2-staging/whats-on/index.astro`
  - Replaced `Weekend picks on Wednesday` with `Weekly weekend picks`.
  - Replaced `Next dispatch Wednesday 6pm` with `Next dispatch Weekly`.

### Confirmation / enquiry copy
- `next/src/pages/partners/apply.astro`
  - Replaced dynamic success message with fixed copy: `Thanks — we've received your enquiry. Our team reviews every submission carefully. If there's a fit, we'll be in touch.`

### Pricing disclaimer additions
- `next/src/pages/tour/index.astro`
  - Added `<p class="editorial-disclaimer">Prices may change. Confirm current rates directly with the venue or operator before booking.</p>` below tour pricing FAQ copy.
- `next/src/pages/fishing/charters/first-charter-guide/index.astro`
  - Added pricing disclaimer below the charter price-band comparison list.
- `next/src/content/articles/mornington-peninsula-stay-and-soak.md`
  - Added pricing disclaimer blockquote after the package pricing mention.
- `next/src/content/articles/peninsula-hot-springs-vs-alba.md`
  - Added pricing disclaimer blockquote after the price comparison section.
- `next/src/content/boat-hire/mornington-boat-hire.md`
  - Added pricing disclaimer blockquote after hire-cost / licence pricing guidance.
- `next/src/content/fishing-charters/im-hooked-fishing-charters.md`
  - Added pricing disclaimer blockquote after pricing / tip guidance.
- `next/src/content/fishing-charters/proline-charters.md`
  - Added pricing disclaimer blockquote after per-person pricing discussion.
- `next/src/content/fishing-charters/reel-time-fishing-charters.md`
  - Added pricing disclaimer blockquote after charter price-band analysis.
- `next/src/content/quick-notes/2026-05-01-jackalope-spa-may-package.md`
  - Added pricing disclaimer blockquote after package-value commentary.
- `next/src/content/quick-notes/2026-05-01-montalto-grape-pick.md`
  - Added pricing disclaimer blockquote after ticket-price/event-value commentary.

### Partnership kit copy cleanup
- `docs/peninsula-insider-advertising-kit-2026-04-30.md`
  - Replaced `Sponsored Listing` with `Editorially reviewed listing`.
  - Replaced `mid-letter sponsored slot` wording with `mid-letter partner placement`.
  - Replaced `Maximum one sponsor per issue` with `Maximum one partner placement per issue` in placements language.
  - Replaced `We respond personally, usually within 48 hours.` with `Our team will review your enquiry.`
  - Replaced evergreen `We publish on Thursdays` wording with `We publish weekly`.
  - Added `Available for FY27 placement (July 2026 – June 2027).` to Founders' Circle, Charter Story, and Featured Venue Story sections.
  - Added `Limited to a small number of partners for FY27.` to Founders' Circle.
  - Replaced one remaining `Sponsored editorial` phrase with `Partner editorial` in the editorial standards section.

### Partnership kit page parity
- `next/src/pages/partners/advertising-kit/index.astro`
  - Replaced `Sponsored Listing` with `Editorially reviewed listing` in table and listings section.
  - Replaced `mid-letter sponsored slot` wording with `mid-letter partner placement`.
  - Replaced `Maximum one sponsor per issue` with `Maximum one partner placement per issue`.
  - Added FY27 availability copy to Founders' Circle, Charter Story, and Featured Venue Story sections.
  - Added `Limited to a small number of partners for FY27.` to Founders' Circle.

### Footer social link
- `next/src/components/Footer.astro`
  - Added Instagram footer link to `https://www.instagram.com/peninsula_insider/`.
  - Added matching footer social styles for layout, link appearance, and hover state.

## Notes
- Date-specific editorial, event schedules, and real dated references were left unchanged where they were part of the actual content rather than evergreen newsletter cadence copy.
- I also updated the live partnership kit Astro page for consistency with the markdown advertising kit.
