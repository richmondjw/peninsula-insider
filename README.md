# Peninsula Insider

A complete, independent guide to the Mornington Peninsula, and a weekly email that surfaces the best of it.

**Live site:** [peninsulainsider.com.au](https://peninsulainsider.com.au)

---

## Documentation lives in the wiki

**[github.com/richmondjw/peninsula-insider/wiki](https://github.com/richmondjw/peninsula-insider/wiki)**

| Start here | For |
|---|---|
| [Architecture](https://github.com/richmondjw/peninsula-insider/wiki/Architecture) | How the system fits together |
| [Developer Guide](https://github.com/richmondjw/peninsula-insider/wiki/Developer-Guide) | Running it locally, the build gate stack, shipping a change |
| [Content Model](https://github.com/richmondjw/peninsula-insider/wiki/Content-Model) | The collections, schemas and controlled vocabularies |
| [CI and Workflows](https://github.com/richmondjw/peninsula-insider/wiki/CI-and-Workflows) | What builds, deploys and publishes, and when |
| [Editorial Operations](https://github.com/richmondjw/peninsula-insider/wiki/Editorial-Operations) | The content engine, the desks, The Insider Note |
| [Runbooks](https://github.com/richmondjw/peninsula-insider/wiki/Runbooks) | When something breaks |
| [Brand and Design](https://github.com/richmondjw/peninsula-insider/wiki/Brand-and-Design) | Voice, palette, the rules copy has to hold |
| [Doc Drift Register](https://github.com/richmondjw/peninsula-insider/wiki/Doc-Drift-Register) | Which documents in `docs/` to distrust, and why |

`docs/` holds design notes, many of them dated. Deep references that are current and maintained: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/cms-architecture.md`](docs/cms-architecture.md).

---

## Quick start

```bash
cd next
npm ci
npm run dev
```

Then activate the pre-commit hook, which is not automatic on a fresh checkout:

```bash
git config core.hooksPath .githooks
```

The site runs without credentials. Reader features that need Supabase degrade rather than break.

---

## Layout

| Path | What it is |
|---|---|
| `next/` | The Astro 6 application. **This is the site.** |
| `engine/` | The Python content engine: orchestrator, generators, gates, alerting |
| `ops/` | Runbooks, reports, email production, strategy state |
| `docs/` | Design documents, dated and uneven |
| `.github/workflows/` | Build and deploy, content tempos, verification gates |

**Directories at the repository root that look like the live site** (`eat/`, `wine/`, `about/`, `_astro/`, `index.html`) **are leftovers of the retired root-deploy model. They are not the live site and editing them does nothing.** The site builds from `next/` to `next/dist` and publishes to the `gh-pages` branch.

---

## House rules

Two of these fail the build, not just review.

- **No em-dashes.** Anywhere, on any surface.
- **No prices.** Ever, including in JSON-LD.
- **No invented venues.** Recommendations come from the published corpus.
- **Never key a CMS override on a filename.** Declare entity identity instead.

Deploy by pushing to `main`. There is no manual deploy step.
