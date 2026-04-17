# Peninsula Insider — Site Changelog

**Purpose:** Deep chronological operating log for Peninsula Insider.

## 2026-04-16 — Dog-Friendly hub Stage 1 seeded

### New hub direction started
- Created a new live hub route at `/dog-friendly/` to begin building the Peninsula Insider pet-owner content system.
- Seeded the first Stage 1 pages for the hub:
  - `/journal/dog-friendly-beaches-mornington-peninsula`
  - `/journal/dog-friendly-cafes-pubs-wineries-mornington-peninsula`
  - `/journal/dog-friendly-accommodation-mornington-peninsula`
- Existing `The Dog-Friendly Peninsula` article remains the practical weekend anchor.

### Purpose
- Move dog-owner utility from one-off article territory into a real Peninsula Insider discovery/product layer.
- Establish a clear route for beaches, stays, venues, and future utility like daycare, boarding, and emergency vet support.

## 2026-04-16 — Daily link audit approved and implemented

### New operational layer
- Approved a new `pi-daily-link-audit` job to scan internal route integrity every day.
- The link audit is designed to catch route drift, broken section prefixes, old slugs, and undefined journal/article targets.

### Policy
- high-confidence internal rewires can auto-fix
- ambiguous replacements must be held for approval or verification
- every report must be saved in both the repo and Mission Control Docs

### Documentation created
- `docs/peninsula-insider-daily-link-audit-spec-2026-04-16.md`
- updated `ops/editorial-jobs.json` to include the new daily job
