/** Converts values like "15m", "30d", "900" into seconds. */
export function ttlToSeconds(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const match = /^(\d+)\s*([smhd])?$/i.exec(value.trim());
  if (!match) return fallback;
  const amount = Number(match[1]);
  const unit = (match[2] ?? "s").toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  return amount * multipliers[unit];
}
