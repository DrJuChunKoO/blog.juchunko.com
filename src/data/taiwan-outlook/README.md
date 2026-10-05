# Taiwan future clock: source and calculation notes

Snapshot: 2026-10-04. Post: `src/content/blog/zh/taiwan-japan-capability-warning.mdx`.

`evidence.json` is a checked-in snapshot, not a live feed. Values in `taiwan`, `japan`, and `modernPairs` are **USD billions**. Values in `historicalPairs` are **USD millions**; the component converts them once for display. Missing values are `null`, never zero. Partial periods are included in the curves at their observed amounts, with explicit period labels, diamonds, dotted connecting segments and a shaded column. They are never annualized or presented as full-year estimates.

## Sources and measurement

- `taiwan`: CBC `BPJ2Q01.csv`, quarterly direct-investment asset and liability flows summed for 2015–2025. Includes reinvested earnings and intercompany debt. This is not all cross-border capital or all cash. Approval columns use MOEA tables; outward excludes the separately reported mainland-China series, inward excludes separately reported mainland investment.
- `taiwanPartial`: CBC 2026 January–June and MOEA 2026 January–August, retained separately by basis and month coverage. Approval totals rechecked against the 2026-09-15 MOEA release on 2026-10-05. The default view is approvals, including 2026 YTD; capital charts display USD hundred millions (source USD billions ×10). The 2025 approval decline of 14.47% is retained.
- `japan`: JETRO `country1_25cy.xlsx` and `country2_25cy.xlsx`, `世界` row, 1983–2000 calendar years; original USD millions / 1000. JETRO warns of definition and currency-conversion discontinuity around 1995. `breakBefore` prevents a visually continuous line. Negative inward values are preserved as net disinvestment.
- `historicalPairs`: BEA financial transactions for Japan–US; Taiwan approval series for Japan–Taiwan; JETRO BOP for both directions of Japan–Korea only from 1995. Earlier Japan→Korea notified values are retained separately as `jpKRNotified` and not spliced into the BOP plot. Early BEA vintages have compilation differences; do not infer a precise cross-country causal panel.
- `modernPairs`: `[period, partner, Taiwan→partner, partner→Taiwan, unused, source ids, definition]`; 2015–2025 plus a 2026 January–August partial row per country, now included in bilateral plots and CSVs with its period label.
- `dram`: `[year, Japan, Korea, US, note, source id, definition]`; proportions by corporate headquarters nationality. Only 1986, 1990, 1995, 2000 are approximate reference observations. Korea 1986 is `<5%`, so the numeric value stays null. Solid Japan and dashed Korea guides connect known benchmarks only, matching the legend; Korea's guide starts in 1990. The component reads this snapshot directly. Guides do not create annual estimates. Do not interpolate missing years or derive Taiwan as a residual.
- `sources`: ID, institution, title, URL, measurement note. Source R1's text is a descriptive working title, not a formal bibliographic title; use the linked article when creating a formal bibliography.

The annual comparison uses net outward FDI divided by its own first-year value ×100. Taiwan 2015 / Japan 1983 alignment is descriptive, not event identification. It does not adjust for prices, exchange rates, economic size, or differences in BOP compilation. Taiwan includes the observed 2026 January–June partial value at relative year 11, marked only on its own series; Japan at the same position remains a full-year observation. The unobserved later Taiwan years remain blank.

## 2025 approval-purpose audit (reviewed 2026-10-05)

`approval-audit-2025.json` retains all twelve monthly outward approvals from the 2026-01-15 MOEA release, workbook `對外總表`, in the original **USD thousands**. Their sum must reconcile to `evidence.json`'s unchanged 2025 annual approval figure. The UI divides by 100,000 to display 億美元.

The 2025-03-26 and 2025-08-27 MOEA meeting PDFs each identify a USD 10bn TSMC Global capitalization for FX-hedging costs and deposit/bond income. These two cases total USD 20bn, about 52% of annual approvals. They are not factory-construction approvals. The audit only identifies these two cases, not all financial-purpose investment; do not interpret other months' dashes as zero financial investment, or the residual as physical investment. Approval months are neither decision nor execution dates. PMI evidence supports contemporaneous uncertainty, not a quantified causal attribution of the annual decline. Annual totals, BOP series, partial periods and clock formulas remain unchanged.

## Clock and scenarios

The calendar clock counts to the **end of the chosen Taipei year**, using UTC December 31 16:00. 2030 and 2035 are author-selected policy-review horizons, not estimated crisis dates. The ring measures elapsed calendar time from Taipei 2026-10-04, not an economic risk score. At expiry it stops at zero and requests a new review.

The capability simulator is illustrative. Default share 70%, review line 50%, and annual growth 5% / 15% are **not observed Taiwan estimates**. The crossing formula is valid for initial share above the line and overseas growth greater than domestic growth. Boundary states are explicit. Absolute capacity indices each start at 100 and are not additive; shares separately incorporate the selected initial weights. No scenario result feeds back into the factual dashboard as a country rating.

The $265bn pipeline is the cumulative multi-year US plan announced in July 2026, corroborated by the TSMC Q2 transcript and NIST/Commerce release. Historical cumulative pledges overlap; never add 12+40+65+165+265. 2024's amount was **over** $65bn, plotted at the disclosed lower bound. Pledges are not expenditure, BOP flow or effective capacity.

`pipeline.json` (reviewed 2026-10-05) keeps those five announcements separate from a `watch` record for Trump's $500bn statement. The primary source is the TIME transcript published 2026-10-01, following the 2026-09-28 interview; the user-supplied INSIDE article is linked as secondary coverage. The speaker did not name TSMC or give an execution year. Both `confirmedCompany` and `executionYear` therefore remain null. The hollow dashed bar in the **2027+ editorial watch area** is neither an announcement date nor an execution forecast. It is not a sixth confirmed company pledge, is not added to $265bn, and feeds neither FDI totals, the factual dashboard nor the clock model. The last confirmed announcement remains selected by default. Confirm company scope, projects and timing before reclassifying this claim.

## Maintenance

### Bilateral expansion and overlay views (2026-10-05)

The three-pair widget defaults to the common **1980–1990** historical window. A visible switch extends all historical pairs to **1980–2000**; no pair is truncated at its own maximum. The original 1975–1979 source rows remain in `evidence.json` but are outside these UI windows. Contemporary views always retain 2015–2025 and the observed 2026 January–August partial period.

The overlay compares the same direction (outward or inward) across eras, not outward against inward. `eraOverlay` fixes Japan 1980 and Taiwan 2015 as relative year zero and uses one calendar year per step, with actual dates in the scrub readouts, data table and CSV. These starts are editorial comparison anchors, not econometrically identified equivalent cycle positions. There is no time warping, peak matching, min/max normalization, correlation score, or estimated crisis date. Both lines share one y-axis. Raw USD billions are the default and are not adjusted for inflation, exchange rates or economic size. The optional index is **value / that series' fixed start-year value × 100**; missing, zero or negative baselines yield a missing index, never an automatic replacement base year. Negative later flows remain negative.

The expansion overlay's history stops at relative year 10 (1990), while Taiwan's 2026 partial observation remains at year 11; the corresponding historical value is explicitly outside the selected window. The full-history overlay extends to year 20 (2000), with Taiwan blank after relative year 11. It never extrapolates Taiwan or maps a missing future date to an observed historical crisis. Korea's pre-1995 bilateral BOP observations stay null; an explicit empty state offers full history, and the unavailable 1980 base prevents an indexed historical Korean line. Earlier notified investment is not substituted. Exports include periods, original amounts, transformed values and basis labels. Hero, factual totals, pending Trump investment claim and clock formulas are unchanged.

Update both directions and keep annual/partial periods separate. Record the snapshot date and revisions. Prefer node/yield/territorial capability observations over dollar proxies. Revise good and bad evidence symmetrically; missingness is not safety and is not failure. No estimated probability, causal coefficient, or arbitrary aggregate warning score is published.

## Cover generation

`python scripts/render-taiwan-outlook-cover.py /path/to/NotoSansTC.ttf` regenerates `cover-2026-ytd.png` using Pillow. It updates only the plot region of the original 1200×630 `cover.png`: title, subtitle, editorial copy, legend, footer and all pixels outside that region remain identical. The cover reads the same annual and partial-period evidence as the interactive charts, retaining the original USD billions unit and 2016 starting year. The 2025 decline stays; the 2026 January–August observation is added with a dotted segment, diamond and period label. No annualization or smoothing is applied. The font is Noto Sans TC (Google Fonts / SIL Open Font License). Regression tests protect the original layout against unintended redesign.
