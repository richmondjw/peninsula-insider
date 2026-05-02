# Accuracy Pass Progress

Status: partial / cautious pass

What I completed:
- Audited the full requested venue list for missing `phone`, `website`, and `visiting.openingHours`
- Built an automated research script at `next/src/content/venues/_accuracy_pass.py`
- Applied only changes I was comfortable keeping after spot-checking

Kept updates:
- `bistro-elba`: added `visiting.openingHours`
- `jetty-road-brewery`: added `visiting.openingHours`
- `peninsula-hot-springs`: added `visiting.openingHours`
- `dexter-wines`: added appointment-only `visiting`
- `garagiste`: added appointment-only `visiting`
- `onannon`: added appointment-only `visiting`

Rolled back noisy / unreliable automation outputs where confidence was not good enough.

Current blocker:
- Many venue sites are JS-heavy, redirect, or block simple fetches, and search-result fallback produced too much noise to safely bulk-write the remaining records.
