const UNIT_TO_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export function durationToMs(input: string): number {
  const match = /^(\d+)([smhd])$/.exec(input.trim());

  if (!match) {
    throw new Error(`Unsupported duration format: ${input}`);
  }

  const amount = Number(match[1]);
  const unit = match[2] as keyof typeof UNIT_TO_MS;
  const multiplier = UNIT_TO_MS[unit];

  if (!multiplier) {
    throw new Error(`Unsupported duration unit: ${unit}`);
  }

  return amount * multiplier;
}
