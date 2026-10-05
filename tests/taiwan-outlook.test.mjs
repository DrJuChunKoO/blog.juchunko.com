import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import {
  benchmarkGuide,
  dramBenchmarks,
  eraOverlay,
  capabilityShare,
  yearsToThreshold,
  reviewDeadline,
  countdownParts,
} from "../src/components/taiwan-outlook/model.ts";

function overlayFixture(country = "美國", direction = 0) {
  const d = JSON.parse(
    readFileSync(
      new URL("../src/data/taiwan-outlook/evidence.json", import.meta.url),
    ),
  );
  const keys =
    country === "美國"
      ? ["jpUS", "usJP"]
      : country === "韓國"
        ? ["jpKR", "krJP"]
        : ["jpTW", "twJP"];
  return [
    d.historicalPairs.map((r) => ({
      year: r.year,
      value: r[keys[direction]] === null ? null : r[keys[direction]] / 1000,
    })),
    d.modernPairs
      .filter((r) => r[1] === country)
      .map((r) => ({
        year: Number(String(r[0]).slice(0, 4)),
        value: r[2 + direction],
        partial: String(r[0]).length > 4,
        period: String(r[0]).length > 4 ? r[0] : undefined,
      })),
  ];
}

test("alignment hypotheses preserve each observation and fixed index denominators", () => {
  for (const country of ["美國", "韓國", "日本"])
    for (const direction of [0, 1]) {
      const fixture = overlayFixture(country, direction);
      const original = eraOverlay(...fixture, 2000, true);
      for (const anchorModernYear of [2026, 2027]) {
        const aligned = eraOverlay(...fixture, 2000, true, {
          anchorModernYear,
        });
        assert.equal(aligned.baseA, original.baseA);
        assert.equal(aligned.baseB, original.baseB);
        for (const row of original.data) {
          if (row.yearA !== null) {
            const moved = aligned.data.find((d) => d.yearA === row.yearA);
            assert.equal(moved.a, row.a);
            assert.equal(moved.x, row.yearA - 1990);
          }
          if (row.yearB !== null) {
            const moved = aligned.data.find((d) => d.yearB === row.yearB);
            assert.equal(moved.b, row.b);
            assert.equal(moved.rawB, row.rawB);
            assert.equal(moved.x, row.yearB - anchorModernYear);
            assert.equal(moved.partialB, row.partialB);
          }
        }
        const zero = aligned.data[aligned.anchorIndex];
        assert.equal(zero.x, 0);
        assert.equal(zero.yearA, 1990);
        if (anchorModernYear === 2027) {
          assert.equal(zero.b, null);
          assert.match(zero.periodB, /2027 尚無觀察值/);
        } else assert.equal(zero.yearB, 2026);
      }
    }
});

test("global alignment preserves the 1995 break and the half-year observation", () => {
  const d = JSON.parse(
    readFileSync(
      new URL("../src/data/taiwan-outlook/evidence.json", import.meta.url),
    ),
  );
  const history = d.japan.map((p) => ({
    year: p.year,
    value: p.outward - p.inward,
    breakBefore: p.breakBefore,
  }));
  const modern = [
    ...d.taiwan.map((p) => ({ year: p.year, value: p.outward - p.inward })),
    {
      year: 2026,
      value: d.taiwanPartial.bop.outward - d.taiwanPartial.bop.inward,
      partial: true,
      period: "2026 1–6月",
    },
  ];
  for (const anchorModernYear of [undefined, 2026, 2027]) {
    const result = eraOverlay(history, modern, 2000, true, {
      historicalStart: 1983,
      anchorModernYear,
    });
    assert.equal(result.data.filter((p) => p.breakBeforeA).length, 1);
    assert.equal(result.data.find((p) => p.breakBeforeA).yearA, 1995);
    const half = result.data[result.latestModernIndex];
    assert.equal(half.yearB, 2026);
    assert.equal(half.partialB, true);
    assert.equal(half.rawB, modern.at(-1).value);
    assert.equal(half.b, (modern.at(-1).value / modern[0].value) * 100);
    if (anchorModernYear) assert.equal(result.data[0].yearA, null);
  }
});

test("the future watch stays outside annual overlay data and exports", () => {
  const watch = JSON.parse(
    readFileSync(
      new URL("../src/data/taiwan-outlook/pipeline.json", import.meta.url),
    ),
  ).watch;
  assert.equal(watch.total * 10, 5000);
  assert.equal(watch.confirmedCompany, null);
  assert.equal(watch.executionYear, null);
  for (const end of [1990, 2000]) {
    const result = eraOverlay(...overlayFixture(), end, false);
    assert.ok(result.data.every((row) => row.rawB !== watch.total));
    assert.ok(
      result.data
        .filter((row) => row.x > 11)
        .every((row) => row.rawB === null && row.b === null),
    );
  }
  const component = readFileSync(
    new URL("../src/components/taiwan-outlook/Outlook.tsx", import.meta.url),
    "utf8",
  );
  assert.match(component, /isOverlay && pair === 0 && direction === 0 &&/);
  assert.match(component, /獨立前瞻註記，未納入曲線、縱軸或年度合計/);
});

test("era overlay uses fixed starts, a common yearly axis and unchanged raw flows", () => {
  const result = eraOverlay(...overlayFixture(), 1990, false);
  assert.equal(result.data.length, 12);
  assert.equal(result.baseA, 0.948);
  assert.equal(result.baseB, 0.3624794634);
  assert.equal(result.data[0].yearA, 1980);
  assert.equal(result.data[0].yearB, 2015);
  assert.equal(result.data[10].a, 18.754);
  assert.equal(result.data[10].b, 5.1535765603);
  assert.ok(result.data[10].b < result.data[9].b, "Retain the 2025 decline");
});

test("the expansion overlay retains 2026 YTD without annualizing or silently adding 1991", () => {
  const result = eraOverlay(...overlayFixture(), 1990, false);
  const last = result.data.at(-1);
  assert.equal(last.x, 11);
  assert.equal(last.a, null);
  assert.equal(last.yearA, null);
  assert.equal(last.periodA, "超出所選歷史區間");
  assert.equal(last.yearB, 2026);
  assert.equal(last.periodB, "2026 1–8月");
  assert.equal(last.b, 23.7122261728);
  assert.equal(last.partialB, true);
});

test("full history restores the Japanese downturn and never projects Taiwan's future", () => {
  const result = eraOverlay(...overlayFixture(), 2000, false);
  assert.equal(result.data.length, 21);
  assert.equal(result.data[11].a, 12.782);
  assert.equal(result.data[12].a, 4.245);
  assert.equal(result.data.at(-1).yearA, 2000);
  for (const row of result.data.slice(12)) {
    assert.equal(row.b, null);
    assert.equal(row.yearB, null);
    assert.equal(row.periodB, "尚無觀察值");
  }
});

test("start indices use transparent denominators, not peak matching, and retain negative flows", () => {
  const result = eraOverlay(...overlayFixture(), 1990, true);
  assert.equal(result.data[0].a, 100);
  assert.equal(result.data[0].b, 100);
  assert.equal(result.data[10].a, (18.754 / 0.948) * 100);
  assert.equal(result.data[11].b, (23.7122261728 / 0.3624794634) * 100);
  const inward = eraOverlay(...overlayFixture("美國", 1), 2000, true);
  assert.equal(inward.data[11].rawA, -0.203);
  assert.ok(inward.data[11].a < 0);
});

test("Korean missingness is not replaced by notified values or a later index base", () => {
  const fixture = overlayFixture("韓國");
  const expansion = eraOverlay(...fixture, 1990, false);
  assert.ok(expansion.data.every((r) => r.a === null));
  const full = eraOverlay(...fixture, 2000, false);
  assert.ok(full.data.slice(15).some((r) => r.a !== null));
  const indexed = eraOverlay(...fixture, 2000, true);
  assert.equal(indexed.canIndexA, false);
  assert.ok(indexed.data.every((r) => r.a === null));
  for (const base of [0, -1, null]) {
    const result = eraOverlay(
      [
        { year: 1980, value: base },
        { year: 1981, value: 10 },
      ],
      fixture[1],
      1990,
      true,
    );
    assert.equal(result.canIndexA, false);
    assert.equal(result.data[1].a, null);
  }
});

test("benchmark guides retain observed coordinates and never turn unknowns into zero", () => {
  const d = JSON.parse(
    readFileSync(
      new URL("../src/data/taiwan-outlook/evidence.json", import.meta.url),
    ),
  );
  const benchmarks = dramBenchmarks(d.dram);
  assert.equal(benchmarks.length, 4);
  const path = (country) =>
    benchmarkGuide(
      benchmarks.map((row) => ({
        x: row.year,
        y: row[country],
      })),
    );
  assert.equal(path("japan"), "M1986,77 L1990,60 L1995,42 L2000,17");
  assert.equal(path("korea"), "M1990,15 L1995,35 L2000,50");
  assert.equal(
    benchmarkGuide([
      { x: 1, y: 10 },
      { x: 2, y: null },
      { x: 3, y: 0 },
      { x: 4, y: 20 },
    ]),
    "M1,10 M3,0 L4,20",
  );
  assert.equal(benchmarkGuide([{ x: 1, y: null }]), "");
});

test("Trump's $500bn watch item is separate from five announced investment totals", () => {
  const d = JSON.parse(
    readFileSync(
      new URL("../src/data/taiwan-outlook/pipeline.json", import.meta.url),
    ),
  );
  assert.equal(d.unit, "USD billions");
  assert.deepEqual(
    d.announcements.map((row) => row.total),
    [12, 40, 65, 165, 265],
  );
  assert.equal(d.watch.status, "unconfirmed-claim");
  assert.equal(d.watch.total, 500);
  assert.equal(d.watch.displayBucket, "2027+*");
  assert.equal(d.watch.statementDate, "2026-09-28");
  assert.equal(d.watch.publishedDate, "2026-10-01");
  assert.equal(d.watch.executionYear, null);
  assert.equal(d.watch.confirmedCompany, null);
  assert.match(d.watch.source, /^https:\/\/time.com\//);
  assert.match(d.watch.coverage, /^https:\/\/www.inside.com.tw\//);
});

test("the analytical crossing solves the share equation", () => {
  const h = yearsToThreshold(0.7, 0.05, 0.15, 0.5);
  assert.ok(h > 9 && h < 10);
  assert.ok(Math.abs(capabilityShare(0.7, 0.05, 0.15, h) - 0.5) < 1e-12);
  assert.ok(capabilityShare(0.7, 0.05, 0.15, h - 0.1) > 0.5);
  assert.ok(capabilityShare(0.7, 0.05, 0.15, h + 0.1) < 0.5);
});
test("equal/faster domestic growth preserves or improves share, including boundary states", () => {
  assert.equal(yearsToThreshold(0.7, 0.15, 0.15, 0.5), Infinity);
  assert.equal(yearsToThreshold(0.7, 0.2, 0.15, 0.5), Infinity);
  assert.equal(yearsToThreshold(0.4, 0.2, 0.15, 0.5), 0);
  assert.ok(Math.abs(capabilityShare(0.7, 0.15, 0.15, 30) - 0.7) < 1e-12);
  assert.ok(capabilityShare(0.7, 0.2, 0.15, 30) > 0.7);
});
test("falling share can coexist with rising absolute domestic capability", () => {
  assert.ok(capabilityShare(0.7, 0.05, 0.15, 10) < 0.7);
  assert.ok(Math.pow(1.05, 10) > 1);
});
test("review clock uses Taipei midnight and stops at zero", () => {
  const end = reviewDeadline(2030);
  assert.equal(new Date(end).toISOString(), "2030-12-31T16:00:00.000Z");
  assert.deepEqual(countdownParts(end - 90061000, end), {
    days: 1,
    hours: 1,
    minutes: 1,
    seconds: 1,
    expired: false,
  });
  assert.deepEqual(countdownParts(end + 1000, end), {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: true,
  });
});
test("evidence snapshot preserves audited totals, negative FDI, breaks and missingness", () => {
  const d = JSON.parse(
    readFileSync(
      new URL("../src/data/taiwan-outlook/evidence.json", import.meta.url),
    ),
  );
  assert.equal(d.taiwan.length, 11);
  const tw = d.taiwan.find((x) => x.year === 2025);
  assert.ok(Math.abs(tw.outward - tw.inward - 34.344) < 1e-9);
  assert.equal(d.japan.find((x) => x.year === 1989).inward, -1.054);
  assert.equal(d.japan.find((x) => x.year === 1995).breakBefore, true);
  assert.equal(d.historicalPairs.find((x) => x.year === 1985).krJP, null);
  assert.equal(d.dram.find((x) => x[0] === 1986)[2], null);
});

test("2026 partial periods remain distinct and preserve the observed approval surge", () => {
  const d = JSON.parse(
    readFileSync(
      new URL("../src/data/taiwan-outlook/evidence.json", import.meta.url),
    ),
  );
  assert.equal(d.taiwanPartial.bop.months, 6);
  assert.equal(d.taiwanPartial.approval.months, 8);
  assert.equal(d.taiwanPartial.approval.outward, 62.3898787359);
  assert.equal(d.taiwanPartial.approval.inward, 16.1810196617);
  assert.equal(d.taiwanPartial.bop.outward, 21.054);
  assert.equal(d.taiwanPartial.bop.inward, 5.284);
  const previous = d.taiwan.slice(-2);
  assert.ok(previous[1].approvedOut < previous[0].approvedOut);
  for (const year of previous)
    assert.ok(d.taiwanPartial.approval.outward > year.approvedOut);
  for (const country of ["美國", "韓國", "日本"]) {
    const rows = d.modernPairs.filter((row) => row[1] === country);
    assert.equal(rows.length, 12);
    assert.equal(rows.at(-1)[0], "2026 1–8月");
  }
});

test("2025 monthly approvals reconcile without removing financial-purpose cases from annual data", () => {
  const d = JSON.parse(
    readFileSync(
      new URL("../src/data/taiwan-outlook/evidence.json", import.meta.url),
    ),
  );
  const audit = JSON.parse(
    readFileSync(
      new URL(
        "../src/data/taiwan-outlook/approval-audit-2025.json",
        import.meta.url,
      ),
    ),
  );
  assert.equal(audit.unit, "USD thousands");
  assert.deepEqual(
    audit.monthly.map((row) => row.month),
    Array.from({ length: 12 }, (_, i) => i + 1),
  );
  const total = audit.monthly.reduce((sum, row) => sum + row.amount, 0);
  assert.ok(
    Math.abs(
      total / 1e6 - d.taiwan.find((row) => row.year === 2025).approvedOut,
    ) < 1e-10,
  );
  assert.deepEqual(
    audit.identifiedCases.map((row) => row.month),
    [3, 8],
  );
  const known = audit.identifiedCases.reduce((sum, row) => sum + row.amount, 0);
  assert.equal(known / 1e5, 200);
  assert.ok(known / total > 0.52 && known / total < 0.521);
  for (const item of audit.identifiedCases) {
    assert.ok(
      item.amount <
        audit.monthly.find((row) => row.month === item.month).amount,
    );
    assert.match(item.purpose, /外匯避險/);
    assert.match(item.sourceUrl, /moea.gov.tw/);
  }
  assert.match(
    audit.limitations,
    /remainder is not a measure of factory construction/,
  );
});

test("hero restores the original layout and copy pixel-for-pixel outside the chart", async () => {
  const path = (name) =>
    new URL(
      `../src/assets/images/taiwan-japan-warning/${name}`,
      import.meta.url,
    );
  const original = await sharp(readFileSync(path("cover.png")))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const revised = await sharp(readFileSync(path("cover-2026-ytd.png")))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(revised.info.width, 1200);
  assert.equal(revised.info.height, 630);
  assert.deepEqual(revised.info, original.info);
  let changedChartPixels = 0;
  for (let y = 0; y < 630; y++) {
    for (let x = 0; x < 1200; x++) {
      const offset = (y * 1200 + x) * original.info.channels;
      const same = original.data
        .subarray(offset, offset + 3)
        .equals(revised.data.subarray(offset, offset + 3));
      if (x < 60 || x >= 1175 || y < 320 || y >= 593) {
        assert.ok(same, `Original editorial layout changed at ${x},${y}`);
      } else if (!same) changedChartPixels++;
    }
  }
  assert.ok(
    changedChartPixels > 1000,
    "The updated data chart must actually be drawn",
  );
});
