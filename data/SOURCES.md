# Reference data sources

Every number in `data/*.json` is copied from one of the sources below, never from memory or
from an AI. Each row's `source` field names the exact entry. Incomplete rows live in
`foods.draft.json`, which the app does not load; `tests/data.test.ts` rejects any row in
`foods.ph.json` or `activities.json` that is missing a value or a source.

| Source | Used for | Accessed |
| --- | --- | --- |
| Herrmann SD, et al. *2024 Adult Compendium of Physical Activities*, [pacompendium.com](https://pacompendium.com/adult-compendium/) | MET values in `activities.json` (codes 01014, 02005, 02054, 12020, 15030, 15055, 15710, 17190, 17200) | 2026-10-10 |
| DOST-FNRI Philippine Food Composition Tables (PhilFCT), [i.fnri.dost.gov.ph/fct](https://i.fnri.dost.gov.ph/fct/library) | kcal per 100 g in `foods.ph.json` | not yet: site unreachable on 2026-10-10 04:20 PHT |
| Product labels | Packaged foods and drinks (photo of the label kept by the team) | not yet |
| Mifflin MD, St Jeor ST, et al. (1990). *A new predictive equation for resting energy expenditure in healthy individuals.* Am J Clin Nutr 51(2):241–247 | BMR formula in `src/shared/calc/bmr.ts` | 2026-10-10 |

## Foods still to source

The demo-script foods are in `foods.draft.json` with `null` values. To promote a row:

1. Look up the entry on PhilFCT (or the product label) and copy the energy per 100 g
   edible portion exactly.
2. Record where the grams per portion came from in `portionSource` (PhilFCT household
   measure, label serving size, or a weighed portion noted by the team).
3. Move the row into `foods.ph.json` and run `npm test`.

`combos.json` (`tapsilog`) is checked against `foods.ph.json` once that file has rows.
