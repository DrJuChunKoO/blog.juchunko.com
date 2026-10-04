import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  capabilityShare,
  yearsToThreshold,
  reviewDeadline,
  countdownParts,
} from "../src/components/taiwan-outlook/model.ts";

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
