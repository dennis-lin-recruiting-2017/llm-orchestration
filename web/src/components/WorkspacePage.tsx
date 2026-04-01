import type { Document } from "../lib/types"

type Props = {
  cfg: { webBaseURL: string; apiBaseURL: string }
  query: string
  mode: string
  loading: boolean
  results: Document[]
  documents: Document[]
  onQueryChange: (value: string) => void
  onSearch: () => void
  onChip: (value: string) => void
}

export function WorkspacePage(props: Props) {
  const chips = ["routing", "agents", "memory", "retrieval", "evaluation", "orchestration"]

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
          <h2>Semantic search demo</h2>
          <div className="search-row">
            <input value={props.query} onChange={(e) => props.onQueryChange(e.target.value)} />
            <button onClick={props.onSearch}>Search</button>
          </div>

          <div className="chips">
            {chips.map((chip) => (
              <button className="chip" key={chip} onClick={() => props.onChip(chip)}>
                {chip}
              </button>
            ))}
          </div>

          <p className="meta">Mode: {props.mode}</p>

          <div className="results">
            {props.loading ? (
              <p>Loading…</p>
            ) : (
              props.results.map((d) => (
                <article className="result-item" key={d.id}>
                  <div className="result-title-row">
                    <h3>{d.title}</h3>
                    <span>{d.category}</span>
                  </div>
                  <p>{d.body}</p>
                  {typeof d.distance === "number" ? <small>distance: {d.distance.toFixed(4)}</small> : null}
                </article>
              ))
            )}
          </div>
        </section>

        <section className="card">
          <h2>Bundled documents</h2>
          <div className="results">
            {props.documents.map((d) => (
              <article className="result-item" key={d.id}>
                <div className="result-title-row">
                  <h3>{d.title}</h3>
                  <span>{d.category}</span>
                </div>
                <p>{d.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </section>
  )
}
