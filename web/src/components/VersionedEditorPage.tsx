import type { VersionedItem } from "../lib/types"

type Props = {
  title: string
  typed: boolean
  status: string
  items: VersionedItem[]
  active: VersionedItem | null
}

export function VersionedEditorPage({ title, typed, status, items, active }: Props) {
  const latest =
    ((active?.versions || []).find((v) => v.version === active?.currentVersion) || {}).content || ""

  const types = ["LLM", "Regex", "CustomJavaScript", "CustomPython"]

  return (
    <main className="editor-layout">
      <section className="card scroll-pane">
        <div className="section-row">
          <h2>{title}</h2>
          <button>New</button>
        </div>

        <div className="item-list">
          {items.map((i) => (
            <button className={`item-card ${active?.id === i.id ? "active" : ""}`} key={i.id}>
              <h3>{i.name}</h3>
              <div className="meta">{i.description}</div>
              {i.type ? <div className="badge">{i.type}</div> : null}
              <small>v{i.currentVersion}</small>
              <div className="badge active-version-badge">Active v{i.currentVersion}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-row">
          <h2>Edit</h2>
          <div className="inline-actions">
            <button>Save</button>
            <button>Delete</button>
          </div>
        </div>

        {typed ? (
          <label>
            Type
            <select>{types.map((t) => <option key={t}>{t}</option>)}</select>
          </label>
        ) : null}

        <label>
          Name
          <input defaultValue={active?.name || ""} />
        </label>

        <label>
          Description
          <input defaultValue={active?.description || ""} />
        </label>

        <label>
          Content
          <textarea rows={18} defaultValue={latest} />
        </label>

        <p className="meta">{status}</p>
      </section>

      <section className="card scroll-pane">
        <h2>Version history</h2>
        <div className="hint">Click anywhere in a version card to confirm and make that version active.</div>

        <div className="history-list">
          {(active?.versions || [])
            .slice()
            .sort((a, b) => b.version - a.version)
            .map((v) => (
              <button type="button" className="history-card restore-version-card" key={v.version}>
                <h3>v{v.version}{active?.currentVersion === v.version ? <span className="badge active-version-badge">Active</span> : null}</h3>
                <small>{new Date(v.updatedAt).toLocaleString()}</small>
                <p>{v.content}</p>
              </button>
            ))}
        </div>
      </section>
    </main>
  )
}
