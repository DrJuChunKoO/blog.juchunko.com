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
