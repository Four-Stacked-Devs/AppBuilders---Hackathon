# Reference data sources

Every number in `data/*.json` is copied from one of the sources below, never from memory or
from an AI. Each row's `source` field names the exact entry. Incomplete rows live in
`foods.draft.json`, which the app does not load; `tests/data.test.ts` rejects any row in
`foods.ph.json` or `activities.json` that is missing a value or a source.

| Source | Used for | Accessed |
| --- | --- | --- |
| Herrmann SD, et al. *2024 Adult Compendium of Physical Activities*, [pacompendium.com](https://pacompendium.com/adult-compendium/) | MET values in `activities.json` (codes 01014, 02005, 02054, 12020, 15030, 15055, 15710, 17190, 17200) | 2026-10-10 |
| DOST-FNRI Philippine Food Composition Tables (PhilFCT), [i.fnri.dost.gov.ph/fct](https://i.fnri.dost.gov.ph/fct/library) | kcal per 100 g in `foods.draft.json` (9 foods, each with its Food ID and report URL) | 2026-10-10 |
| Product labels | Packaged foods and drinks (photo of the label kept by the team) | not yet |
| Mifflin MD, St Jeor ST, et al. (1990). *A new predictive equation for resting energy expenditure in healthy individuals.* Am J Clin Nutr 51(2):241–247 | BMR formula in `src/shared/calc/bmr.ts` | 2026-10-10 |

## Foods still to source

PhilFCT's public food reports give values per 100 g only; they have no household measures, so
no row has a sourced `portions` value yet. Four foods have no PhilFCT entry at all (chicken
adobo, fried egg, beef tapa, milk tea); each draft row's `note` says what is missing. To
promote a row:

1. Look up the entry on PhilFCT (or the product label) and copy the energy per 100 g
   edible portion exactly.
2. Record where the grams per portion came from in `portionSource` (PhilFCT household
   measure, label serving size, or a weighed portion noted by the team).
3. Move the row into `foods.ph.json` and run `npm test`.

`combos.json` (`tapsilog`) is checked against `foods.ph.json` once that file has rows.

## Update: bulk import (2026-10-10)

- **PhilFCT:** `data/foods.ph.json` now holds all 1,539 foods in the public PhilFCT reports
  (report ids 2963-5013), imported by `scripts/import-philfct.py`. Each row carries energy,
  protein, fat, carbohydrate and fibre per 100 g edible portion, copied from the report, with its
  Food ID and report URL. Rows whose energy disagrees with 4P+9F+4C by a wide margin would go to
  `data/foods.flagged.json` (none did). PhilFCT publishes no redistribution terms; each row cites
  its source, and the team should ask FNRI for written permission.
- **Portions are estimates.** PhilFCT has no household measures. `data/portions.estimates.json`
  holds team estimates by food group and name pattern; every row is flagged `portionEstimated`.
- **Taglish names:** `data/aliases.tl.json` maps Filipino and Taglish names to the nearest PhilFCT
  entry. Names are not numbers, so they need no source. Some are approximate (for example
  "adobong manok" uses the pork and chicken adobo entry); the card shows the real entry name.
- **Activities:** `data/activities.json` has 42 rows from the 2024 Adult Compendium, each citing
  its code and description from pacompendium.com. Sipa, sepak takraw, arnis and jeepney commuting
  have no Compendium entry; they are aliased to the nearest code.
