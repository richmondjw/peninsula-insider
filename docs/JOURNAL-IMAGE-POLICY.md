# Journal image policy

Every published Journal article must have an associated image. Every image-bearing Journal story card and article hero must render an image. A missing file must never silently remove the figure or leave an empty space.

## Choose an image before publication

1. Prefer a relevant, available article photograph or approved uploaded image. Record descriptive alt text, the creator/supplier credit, source, rights and a caption. Keep the metadata attached to that exact image.
2. Search the licensed Visit Victoria library with `node ops/scripts/visit-victoria/find-images.mjs "<subject or place>" --json`. Use READY assets and copy their attribution and permission records intact. Record new placements with `record-placements.mjs --write`. The existing Visit Victoria licence gate remains mandatory.
3. If no suitable photograph is available, commission an original illustration or use licensed clip art. Record its source and permission; label it as an illustration. Generated imagery must not claim to depict a real venue, person, artwork or event unless that depiction has been verified. Never use a Visit Victoria photograph as input to a generative edit.
4. Until a dedicated image is ready, use the licensed thematic context photograph selected by `resolveJournalImage`. Its caption identifies the actual photographed place and explains that it is regional context. The original coastal SVG is the final fallback if the thematic asset is unavailable.

An image found on the web is a candidate, not permission to publish it. A credit string alone does not establish rights. AI generation and searches happen in the editorial workflow, not inside a production build.

## Automatic protection

- `resolveJournalImage` is shared by the Journal front and article detail template. It respects CMS slot identity and accepts uploaded replacements only when their own alt text and credit are present.
- Local file checks strip cache parameters, reject traversal, and use the asset directory rather than the current working directory. A generic-photo classification cannot remove a Journal image slot.
- If a photograph fails to load in the browser, `JournalImageRecovery` replaces it with the thematic photograph, then the original illustration. It updates alt text, caption and credit together and clears obsolete responsive derivatives.
- `assert-journal-images.mjs` runs before and after the build. It rejects broken published article references, missing fallback assets, blank image-bearing Journal cards, broken local built images and missing recovery metadata.
- Unit tests cover missing records/files, incomplete metadata, CMS provenance, thematic selection, cache parameters and the original illustration. Release checks must also verify that visible images load on desktop and mobile and that forced image failure recovers.

Text navigation, the editor's numbered reading list and the compact archive remain text lists. The linked articles still receive the same associated-image policy; these list layouts are not allowed to justify a missing article hero.
