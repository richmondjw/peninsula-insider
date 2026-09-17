# Responsive image delivery

`responsive-images-integration.mjs` runs after Astro renders and before image
cache stamping. Home cover, home Journal feature, shared cards, subpage heroes
and hub heroes opt in with `data-pi-responsive` containing their display sizes.
The integration changes only these image start tags. It does not change CMS
rows, content records, alt text, attribution, structured data or photographs.

Local `/images/` assets and the site's public CMS asset bucket are allowed.
Remote redirects and other hosts are not fetched. Downloads are bounded to
25 MB and 20 seconds, decode to at most 50 million pixels, and transforms run
sequentially. Unsupported and animated files retain their original delivery.
Missing allowed assets or failed downloads stop the build rather than publish
broken derivatives. Admin and dev fixtures are excluded.

WebP derivatives use quality 80 and widths 480, 800, 1280 and 1920, capped to
the original width. Names hash the source bytes and transformation policy.
The browser chooses from `srcset` using the component's sizes. Original
dimensions are added only when the component did not already declare them.
All derivatives are static files under `/_media/`, requiring no runtime
subscription or image server. `image-delivery.json` records source and byte
sizes for post-deployment verification.

The inline editor reads `data-pi-image-original-src` for the actual source.
A replacement removes the old srcset and original-source marker immediately;
the next normal build optimises the new published asset. Existing CMS slot
identities, permissions and provenance rules remain authoritative.

Tests run in the normal build. Validate the actual mobile and desktop layout,
loaded images, current source, and byte counts after deployment. Lighthouse
is a lab measurement; it cannot demonstrate real-user Core Web Vitals, better
rankings or increased sales by itself. Revert this change to restore original
delivery without modifying any CMS image or content record.
