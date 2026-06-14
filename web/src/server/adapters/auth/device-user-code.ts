/** Short human-readable device-flow user code (e.g. `WXYZ-1234`). */
export function generateShortUserCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (): string =>
    chars[Math.floor(Math.random() * chars.length)] ?? "X";
  return `${pick()}${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}${pick()}`;
}
