# Taiwan future clock: source and calculation notes

Snapshot: 2026-10-04. Post: `src/content/blog/zh/taiwan-japan-capability-warning.mdx`.

`evidence.json` is a checked-in snapshot, not a live feed. Values in `taiwan`, `japan`, and `modernPairs` are **USD billions**. Values in `historicalPairs` are **USD millions**; the component converts them once for display. Missing values are `null`, never zero. Dates in partial periods are excluded from full-year curves.

## Sources and measurement

- `taiwan`: CBC `BPJ2Q01.csv`, quarterly direct-investment asset and liability flows summed for 2015–2025. Includes reinvested earnings and intercompany debt. This is not all cross-border capital or all cash. Approval columns use MOEA tables; outward excludes the separately reported mainland-China series, inward excludes separately reported mainland investment.
- `japan`: JETRO `country1_25cy.xlsx` and `country2_25cy.xlsx`, `世界` row, 1983–2000 calendar years; original USD millions / 1000. JETRO warns of definition and currency-conversion discontinuity around 1995. `breakBefore` prevents a visually continuous line. Negative inward values are preserved as net disinvestment.
- `historicalPairs`: BEA financial transactions for Japan–US; Taiwan approval series for Japan–Taiwan; JETRO BOP for both directions of Japan–Korea only from 1995. Earlier Japan→Korea notified values are retained separately as `jpKRNotified` and not spliced into the BOP plot. Early BEA vintages have compilation differences; do not infer a precise cross-country causal panel.
- `modernPairs`: `[period, partner, Taiwan→partner, partner→Taiwan, unused, source ids, definition]`; 2015–2025 plus a separately retained 2026 partial row per country.
- `dram`: `[year, Japan, Korea, US, note, source id, definition]`; proportions by corporate headquarters nationality. Only 1986, 1990, 1995, 2000 are approximate reference observations. Korea 1986 is `<5%`, so the numeric value stays null. Do not interpolate missing years or derive Taiwan as a residual.
- `sources`: ID, institution, title, URL, measurement note. Source R1's text is a descriptive working title, not a formal bibliographic title; use the linked article when creating a formal bibliography.

The annual comparison uses net outward FDI divided by its own first-year value ×100. Taiwan 2015 / Japan 1983 alignment is descriptive, not event identification. It does not adjust for prices, exchange rates, economic size, or differences in BOP compilation. Taiwan observations end in 2025; the graphic never invents the subsequent years.

## Clock and scenarios

The calendar clock counts to the **end of the chosen Taipei year**, using UTC December 31 16:00. 2030 and 2035 are author-selected policy-review horizons, not estimated crisis dates. The ring measures elapsed calendar time from Taipei 2026-10-04, not an economic risk score. At expiry it stops at zero and requests a new review.

The capability simulator is illustrative. Default share 70%, review line 50%, and annual growth 5% / 15% are **not observed Taiwan estimates**. The crossing formula is valid for initial share above the line and overseas growth greater than domestic growth. Boundary states are explicit. Absolute capacity indices each start at 100 and are not additive; shares separately incorporate the selected initial weights. No scenario result feeds back into the factual dashboard as a country rating.

The $265bn pipeline is the cumulative multi-year US plan announced in July 2026, corroborated by the TSMC Q2 transcript and NIST/Commerce release. Historical cumulative pledges overlap; never add 12+40+65+165+265. 2024's amount was **over** $65bn, plotted at the disclosed lower bound. Pledges are not expenditure, BOP flow or effective capacity.

## Maintenance

Update both directions and keep annual/partial periods separate. Record the snapshot date and revisions. Prefer node/yield/territorial capability observations over dollar proxies. Revise good and bad evidence symmetrically; missingness is not safety and is not failure. No estimated probability, causal coefficient, or arbitrary aggregate warning score is published.
