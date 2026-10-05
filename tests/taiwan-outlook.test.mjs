import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import {
  benchmarkGuide,
  dramBenchmarks,
  capabilityShare,
  yearsToThreshold,
  reviewDeadline,
  countdownParts,
} from "../src/components/taiwan-outlook/model.ts";

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
