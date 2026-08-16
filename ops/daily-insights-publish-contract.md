# Daily insights publishing contract

The daily-insights publisher writes one JSON document to:

`next/src/content/daily-insights/YYYY-MM-DD.json`

The static Astro route renders it at:

`https://peninsulainsider.com.au/pi-admin/daily/YYYY-MM-DD/`

Required top-level fields are `date`, `title`, `generatedAt`, `actToday`,
`news`, `events`, `competitors`, `opportunities`, and `rawCaptures`. Use the
seed document `2026-08-15.json` as the schema template. URLs must be absolute
and all text must be plain text (no HTML fragments). The page is explicitly
noindex and absent from navigation and search.

After writing the entry, the publisher must commit and push only the Peninsula
Insider change, wait for the build/deploy workflow, then link the generated
page in the Radar-topic Telegram summary. It must not read, pull, write, or
push the Optiflows repository.
