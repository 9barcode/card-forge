const successThresholds: Readonly<Record<number, number>> = {
  2: 1_000_000,
  3: 900_000,
  4: 800_000,
  5: 700_000,
  6: 600_000,
  7: 500_000,
  8: 400_000,
  9: 331_300,
  10: 200_000,
};

export function drawEnhancementResult(
  targetLevel: number,
  randomTicket: number,
): 'SUCCESS' | 'FAILURE' {
  const threshold = successThresholds[targetLevel];
  if (threshold === undefined) throw new Error('INVALID_TARGET_ENHANCEMENT_LEVEL');
  if (!Number.isInteger(randomTicket) || randomTicket < 0 || randomTicket >= 1_000_000) {
    throw new Error('INVALID_ENHANCEMENT_RANDOM_TICKET');
  }
  return randomTicket < threshold ? 'SUCCESS' : 'FAILURE';
}

export function secureEnhancementTicket(): number {
  const range = 0x1_0000_0000;
  const limit = Math.floor(range / 1_000_000) * 1_000_000;
  const values = new Uint32Array(1);
  do crypto.getRandomValues(values); while ((values[0] ?? range) >= limit);
  return (values[0] ?? 0) % 1_000_000;
}
