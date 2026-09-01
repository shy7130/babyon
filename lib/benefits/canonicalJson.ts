// jsonb round-trips through Postgres re-order object keys, so a plain JSON.stringify
// comparison between a DB-fetched payload and a freshly-built in-memory payload will
// report "changed" even when they are semantically identical. This helper produces a
// stable string representation by recursively sorting object keys (array order is
// preserved, since array position is semantically meaningful).
export function canonicalStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value))
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep)
  }
  if (value !== null && typeof value === 'object') {
    const sortedKeys = Object.keys(value as Record<string, unknown>).sort()
    const result: Record<string, unknown> = {}
    for (const key of sortedKeys) {
      result[key] = sortKeysDeep((value as Record<string, unknown>)[key])
    }
    return result
  }
  return value
}
