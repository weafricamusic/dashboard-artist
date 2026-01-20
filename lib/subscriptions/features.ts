export function getFeatureValue(features: unknown, path: string): unknown {
  if (!features || typeof features !== "object") return undefined;

  const parts = path.split(".").map((p) => p.trim()).filter(Boolean);
  let current: unknown = features;

  for (const part of parts) {
    if (!current || typeof current !== "object") return undefined;
    const rec = current as Record<string, unknown>;
    current = rec[part];
  }

  return current;
}

export function hasFeature(features: unknown, path: string, fallback = false): boolean {
  const value = getFeatureValue(features, path);
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1" || value === 1) return true;
  if (value === "false" || value === "0" || value === 0) return false;
  return fallback;
}

export function getFeatureInt(features: unknown, path: string, fallback: number): number {
  const value = getFeatureValue(features, path);
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}
