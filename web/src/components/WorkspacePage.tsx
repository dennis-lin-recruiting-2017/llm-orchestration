import { useCallback, useEffect, useState } from "react"
import { getJSON } from "../lib/api"
import type { Document } from "../lib/types"

type SearchType = "vector" | "keyword"

type Props = {
  cfg: { webBaseURL: string; apiBaseURL: string }
  query: string
  mode: string
  loading: boolean
  results: Document[]
  onQueryChange: (value: string) => void
  onSearch: (type: SearchType) => void
  onChip: (value: string, type: SearchType) => void
}

export function WorkspacePage(props: Props) {
  const chips = ["routing", "agents", "memory", "retrieval", "evaluation", "orchestration"]
  const [allDocs, setAllDocs] = useState<Document[]>([])
  const [searchType, setSearchType] = useState<SearchType>("vector")

  const loadDocs = useCallback(async () => {
    try {
      const data = await getJSON<{ documents: Document[] }>(`${props.cfg.apiBaseURL}/api/documents`)
      setAllDocs(data.documents ?? [])
    } catch {
      // keep empty on error
    }
  }, [props.cfg.apiBaseURL])

  useEffect(() => {
    loadDocs()
  }, [loadDocs])

  const hasResults = props.results.length > 0
  const searchedIds = new Set(props.results.map((d) => d.id))

  // Sort all articles so matched results appear first in relevance order,
  // followed by unmatched articles in their original corpus order.
  const sortedDocs = hasResults
    ? [
        ...props.results.map((r) => allDocs.find((d) => d.id === r.id)).filter((d): d is Document => d !== undefined),
        ...allDocs.filter((d) => !searchedIds.has(d.id)),
      ]
    : allDocs

  function handleSearch() { props.onSearch(searchType) }
  function handleChip(chip: string) { props.onChip(chip, searchType) }

  return (
    <section className="content-shell">
      <header className="hero">
        <p className="eyebrow">Retrieval-augmented generation</p>
        <h1>RAG</h1>
        <p className="lede">
          Web UI on {props.cfg.webBaseURL} and API on {props.cfg.apiBaseURL}.
        </p>
      </header>

      <main className="grid">
        <section className="card">
          <h2>Semantic search</h2>
          <div className="search-row">
            <input
              value={props.query}
              onChange={(e) => props.onQueryChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button onClick={() => { setSearchType("vector"); props.onSearch("vector") }}>Vector Search</button>
            <button onClick={() => { setSearchType("keyword"); props.onSearch("keyword") }}>Keyword Search</button>
          </div>

          <div className="chips">
            {chips.map((chip) => (
              <button className="chip" key={chip} onClick={() => handleChip(chip)}>
                {chip}
              </button>
            ))}
          </div>

          <p className="meta">Mode: {props.mode || "—"}</p>

          {props.loading ? (
            <p>Loading…</p>
          ) : hasResults ? (
            <div className="results">
              {props.results.map((d) => (
                <article className="result-item" key={d.id}>
                  <div className="result-title-row">
                    <h3>{d.title}</h3>
                    <span className="tag">{d.category}</span>
                  </div>
                  <p>{d.body}</p>
                  {typeof d.distance === "number" && (
                    <p className="meta">distance: {d.distance.toFixed(4)}</p>
                  )}
                </article>
              ))}
            </div>
          ) : props.mode === "vector-no-embedding" ? (
            <p className="meta">No vector embedding available for this query. Try a keyword chip or switch to keyword search.</p>
          ) : (
            <p className="meta">No results — try a keyword chip or freeform query.</p>
          )}
        </section>

        <section className="card">
          <h2>All articles ({allDocs.length})</h2>
          <div className="results scroll-pane">
            {sortedDocs.map((d) => {
              const match = props.results.find((r) => r.id === d.id)
              return (
                <article className={`result-item${match ? " run-result-pass" : ""}`} key={d.id}>
                  <div className="result-title-row">
                    <h3>{d.title}</h3>
                    <span className="tag">{d.category}</span>
                  </div>
                  <p>{d.body}</p>
                  {match && typeof match.distance === "number" && (
                    <p className="meta">distance: {match.distance.toFixed(4)}</p>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      </main>
    </section>
  )
}
