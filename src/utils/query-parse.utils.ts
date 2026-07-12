/**
 * Shared query/body integer parsing for API routes.
 */
export function parseBoundedInt(
  value: unknown,
  options: { min?: number; max?: number; fallback?: number } = {}
): { ok: true; value: number } | { ok: false; error: string } {
  const { min = 1, max = Number.MAX_SAFE_INTEGER, fallback } = options;

  if (value == null || value === '') {
    if (fallback != null) return { ok: true, value: fallback };
    return { ok: false, error: 'value required' };
  }

  const n = parseInt(String(value), 10);
  if (!Number.isFinite(n)) {
    return { ok: false, error: 'must be a valid integer' };
  }
  if (n < min) {
    return { ok: false, error: `must be >= ${min}` };
  }
  if (n > max) {
    return { ok: true, value: max };
  }
  return { ok: true, value: n };
}

export function parseOptionalSeed(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : undefined;
}
