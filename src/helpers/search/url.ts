/**
 * Parses a query string into a flat object of strings. A key that repeats becomes an
 * array of its values in order.
 * e.g. "?langs=go&langs=rust&minStars=100" → { langs: ['go', 'rust'], minStars: '100' }
 */
export function parseSearch(searchStr: string): Record<string, unknown> {
  const params = new URLSearchParams(searchStr)
  const result: Record<string, unknown> = {}
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key)
    result[key] = values.length > 1 ? values : values[0]
  }
  return result
}

/**
 * Serialises a flat object into a query string, repeating the key for each array item.
 * Output is URLSearchParams' own encoding, so re-encoding it yields the same string.
 * Undefined values and empty arrays are omitted; a one-item array reads back as a string.
 * e.g. { langs: ['go', 'rust'], minStars: 100 } → "?langs=go&langs=rust&minStars=100"
 */
export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item))
    } else {
      params.set(key, String(value))
    }
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}
