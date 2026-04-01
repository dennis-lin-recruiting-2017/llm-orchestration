import { getJSON } from "./api"
import type { Document } from "./types"

/**
 * Fetches search results for `q` and returns them formatted as a text block
 * suitable for substituting into a prompt template via {{query}}.
 *
 * If the query is blank or the search returns no results the raw query string
 * is returned unchanged so the prompt still gets something meaningful.
 */
export async function fetchFormattedSearchResults(
  apiBaseURL: string,
  q: string,
): Promise<string> {
  if (!q.trim()) return q
  const data = await getJSON<{ results: Document[] }>(
    `${apiBaseURL}/api/search?q=${encodeURIComponent(q)}`,
  )
  const results = data.results ?? []
  if (results.length === 0) return q
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.body}`)
    .join("\n\n")
}
