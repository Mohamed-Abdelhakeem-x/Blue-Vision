export function boostDisplayedConfidence(raw: number): number {
  const clamped = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0;

  if (clamped <= 0) {
    return 0;
  }

  const aggressivelyBoosted = 0.9 + (clamped * 0.095);
  return Math.min(0.995, Math.max(clamped, aggressivelyBoosted));
}

export function formatBoostedConfidence(raw: number, digits = 0): string {
  return `${(boostDisplayedConfidence(raw) * 100).toFixed(digits)}%`;
}
