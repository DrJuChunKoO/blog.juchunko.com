/** Select the four source benchmarks and convert fractional shares to percentage points. */
export function dramBenchmarks(rows: (number | string | null)[][]) {
  return rows
    .filter(([year]) => [1986, 1990, 1995, 2000].includes(year as number))
    .map(([year, japan, korea]) => ({
      year: year as number,
      japan: (japan as number) * 100,
      korea: korea === null ? null : (korea as number) * 100,
    }));
}

/** Join observed benchmark coordinates only; nulls break the guide, never become zero. */
export function benchmarkGuide(points: { x: number; y: number | null }[]) {
  let connected = false;
  return points
    .map(({ x, y }) => {
      if (y === null) {
        connected = false;
        return "";
      }
      const command = connected ? "L" : "M";
      connected = true;
      return `${command}${x},${y}`;
    })
    .filter(Boolean)
    .join(" ");
}

/** Illustrative two-region model. Inputs are scenarios, never observed national scores. */
export function capabilityShare(
  initialShare: number,
  domesticGrowth: number,
  overseasGrowth: number,
  years: number,
) {
  const domestic = initialShare * Math.pow(1 + domesticGrowth, years);
  const overseas = (1 - initialShare) * Math.pow(1 + overseasGrowth, years);
  return domestic / (domestic + overseas);
}

export function yearsToThreshold(
  initialShare: number,
  domesticGrowth: number,
  overseasGrowth: number,
  threshold: number,
) {
  if (initialShare <= threshold) return 0;
  if (overseasGrowth <= domesticGrowth) return Infinity;
  return (
    Math.log(
      (initialShare * (1 - threshold)) / (threshold * (1 - initialShare)),
    ) / Math.log((1 + overseasGrowth) / (1 + domesticGrowth))
  );
}

/** Taipei review boundary: start of Jan 1 after the chosen review year. */
export function reviewDeadline(year: number) {
  return Date.UTC(year, 11, 31, 16, 0, 0);
}

export function countdownParts(now: number, deadline: number) {
  const seconds = Math.max(0, Math.floor((deadline - now) / 1000));
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor(seconds / 3600) % 24,
    minutes: Math.floor(seconds / 60) % 60,
    seconds: seconds % 60,
    expired: now >= deadline,
  };
}
