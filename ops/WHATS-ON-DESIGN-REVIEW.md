# What's On visual design review

This is a design subscore, separate from the 95/100 production acceptance gate in `WHATS-ON-95.md`. It cannot establish overall acceptance on its own. Review the same live page at 390px and 1440px, with the cookie note open, on the same day. Score only observed behaviour. A claim that Peninsula Insider leads either comparator requires fresh screenshots and the same visitor tasks for all three sites.

| Criterion | Points | Full-credit standard |
| --- | ---: | --- |
| Immediate event decision | 25 | Date choice and a real event's title, when, where and next action are usable in the first 844px at 390px. |
| Visual identity and composition | 20 | Distinct Peninsula art direction, strong hierarchy, expressive typography and deliberate space, without generic catalogue repetition. |
| Accurate editorial imagery | 20 | Current, rights-cleared images match the subject, remain well cropped at all widths, have visible attribution and never substitute unrelated event imagery. |
| Curated discovery | 15 | Three timely choices with useful reasons precede the long inventory; users can move from inspiration to a complete date-led calendar. |
| Responsive interaction | 10 | Touch targets, keyboard focus, scope and filters all remain clear at 320, 390, 768 and 1440px, including empty and alternate-date states. |
| Legibility and performance | 10 | Text contrast and reading order hold; no overflow or avoidable layout shift; hero image is sized and delivery remains fast on mobile. |

**Design pass:** at least 95/100, no criterion below 80% of its available points, plus the same-task visitor comparison must beat [Visit Mornington Peninsula](https://www.visitmorningtonpeninsula.org/Whats-On/FindWhatsOn) and [City of Melbourne](https://whatson.melbourne.vic.gov.au/). Five representative readers must find a suitable event within one minute. The visual score is provisional until an independent reviewer and those readers test the production version.

## Loop 1, 3 October 2026

The previous Peninsula Insider page prioritised compact date-led rows. It was useful but opened as a plain list, with its photographed picks below every day group. The first redesigned local preview now leads with a licensed Mornington Farmers Market photograph, places three curated events before the long calendar, uses a navy and cream editorial spread, and keeps date controls immediately below the hero. Its first fallback-image pick becomes a text-led card on narrow screens so the title, description and event metadata are visible without scrolling through an unrelated placeholder plate. The calendar remains complete and date-led.

The benchmark screenshots taken during this work show Visit Mornington Peninsula using a large photographic opening and image-led unmissable events, but putting dated decisions deeper down the page. City of Melbourne uses stronger colour and visual modules, including search and editorial imagery; its opening screen likewise emphasises exploration before a specific dated event. Both observations are visual judgments on the observed pages, not claims about their data quality or conversion. Their layouts can change, so rescore them with fresh captures at the next comparison.

| Observed design | Immediate /25 | Identity /20 | Imagery /20 | Curation /15 | Interaction /10 | Legibility /10 | Provisional total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| PI before this loop | 22 | 6 | 4 | 8 | 8 | 8 | **56/100** |
| PI local redesign | 23 | 17 | 13 | 13 | 9 | 7 | **82/100** |
| PI local loop 2 | 23 | 18 | 15 | 14 | 9 | 8 | **87/100** |
| City of Melbourne observed page | 13 | 20 | 19 | 15 | 9 | 8 | **84/100** |
| Visit Mornington Peninsula observed page | 9 | 16 | 19 | 11 | 8 | 9 | **72/100** |

These are editorial design judgments from the screenshots and visible controls, not independent acceptance scores. City was ahead after loop 1 because its visual modules and image mix felt more varied. Loop 2 is provisionally ahead on this visual rubric, but a same-task reader comparison is still needed before claiming the site beats City. PI's image score is held back by only two photographed picks in the current set and a regional market photograph in the opening spread. Its legibility/performance score is capped until the final delivered images and mobile speed are measured. Visit Mornington Peninsula is stronger on photography but its dated event decision is much deeper into the observed phone page.

**Current evidence:** local preview at 320, 390, 768 and 1440px; no horizontal overflow at those widths; the first curated event's date/place line ends at 838px at 390px with the cookie note open. The final 1009-page production build, image-rights and Visit Victoria gates, house-style and CSS budget checks, 26 discovery-journey tests and the event safeguard gate passed. A production screenshot is still required for this revision. The provisional score must be rescored on production and through the five-reader, same-task comparison. The overall 95/100 goal remains open.

**Next weakest area:** the full calendar and category shelves are still row-heavy. Test a denser visual date navigator and restrained category artwork or pictograms without adding inaccurate stock photos or slowing the page. Expand rights-cleared, event-specific imagery so all three picks can be photo-led when an approved image exists. Keep title, time, place, source and action readable for events without imagery.

## Loop 2, 3 October 2026

The first redesign was released in PR #547 as `383a01995a97b5ee2ba2d8b78609244493c9dd0a`. Production run `37125661647` passed; the public `/deployment.json` returned that SHA and run. A fresh public browser at 390px, with the cookie note open, loaded the hero image, placed picks before the calendar, and showed the first pick's date and place by 838px with no horizontal overflow. The first local 82/100 visual judgment therefore applies to the live page, but remains provisional.

The second local pass gives the lower half a different rhythm: a horizontally browsable category gallery with three credited, accurately captioned photos and two numbered type tiles where no verified subject-matched photo exists; date and category headings form a left editorial rail on desktop while event rows stay readable on mobile. The regional category photos are labelled as their actual subjects, not as photographs of every event in the section. At 320, 390, 768 and 1440px there is no document overflow; the category rail scrolls inside its own bounds below 1024px. A client-selected next weekend also uses the desktop grid. The **87/100** row is a local, provisional visual grade. Production release, five-reader task evidence and the overall 95/100 gate remain open.

The next loop should replace the remaining generic and missing event artwork with rights-cleared, subject-matched assets where possible, then test the full page with five readers and compare actual task success to both named sites. A score of 95 cannot be earned by adding decorative images alone.
