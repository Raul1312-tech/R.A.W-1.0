# Food search and reference data

The meal generator still uses its existing halal-compatible recipe ingredients. The larger catalog is for logging what somebody actually ate, including foods outside the planned diet. Logging pork does not add pork to generated menus. The UI never certifies imported products as halal or allergen-free.

## Bundled reference foods

119 additional foods are derived from USDA FoodData Central SR Legacy, April 2018. Spanish names, food groups and preparation descriptions are maintained in `data/usda-foods-es.tsv`; original descriptions and numeric provenance are in `data/usda-provenance.json`. Rebuild using `node scripts/build-food-catalog.mjs <unpacked CSV directory>`.

- Official download: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
- Documentation and public-domain data: https://fdc.nal.usda.gov/data-documentation/
- Nutrients per **100 g** of the specified edible food: energy 1008, protein 1003, fat 1004. Carbohydrate is computed as carbohydrate-by-difference 1005 minus dietary fiber 1079 (floor zero), to approximate the available-carbohydrate convention used by European labels. It is not a laboratory reanalysis. For zero-total-carbohydrate foods, missing fiber is treated as zero; otherwise incomplete records are excluded.
- USDA beverages also remain gram-based; no density conversion is invented.
- Generic values are reference estimates, not a substitute for a specific brand's label. Allergen metadata is an editorial ingredient aid and does not determine suitability. Product processing and traces can differ.

## Open Food Facts

Official API documentation: https://openfoodfacts.github.io/openfoodfacts-server/api/ and https://openfoodfacts.github.io/search-a-licious/users/ref-openapi/.

An explicit Search action queries `https://search.openfoodfacts.org/search` through `/api/foods/search`. There is no API key, AI model call or paid search subscription. It still requires internet and has provider rate limits; it is not an unlimited-availability service. Only the food query and page are transmitted, never profiles, journal data or authentication. Numeric barcodes use an exact code query. Search supports Spanish and English.

Per-instance sliding limit: 8 upstream requests/minute, with request coalescing, maximum 24 hits/page, 20 pages, a 12-second timeout, a bounded 24-hour memory cache and CDN response caching. Serverless instances do not share the limiter; at higher traffic a shared limiter/index would be needed to guarantee the provider's 10-search/minute/IP budget. No paid infrastructure is introduced. Browser requests occur on submit, never on each keystroke; stale responses are ignored. Selected foods are stored inside the existing private/local journal and reused from that profile's history without another lookup.

Missing nutrients never become zero. Require energy, protein, carbohydrates and fat, reject invalid amounts and broad energy inconsistencies, and show how to enter a label when records are incomplete. Prepared-only nutrition is not substituted for as-sold values. OFF's normalized `_100g` values can describe 100 g or 100 ml; the basket exposes a unit selector so users can match the package. No density conversion or automatic brand equivalence is assumed.

Attribution is visible in the picker and each source card links to its product. Open Food Facts data is under ODbL 1.0; individual contents under DbCL. See https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/ and https://opendatacommons.org/licenses/odbl/1-0/. The public search endpoint returns only public OFF records with no private journal data; upstream product data is not merged into or redistributed as the bundled USDA dataset. No OFF images are used.

Tests cover provenance, category/search behavior, conversion and rejected nutrition, journal round trips, provider errors, pagination, caching and throttling. UI verification includes the user's salchichón search and local-only food logging on a separate localhost origin.
