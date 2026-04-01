import { useCallback, useEffect, useRef, useState, useMemo } from "react"
import { getJSON } from "../lib/api"
import { fetchFormattedSearchResults } from "../lib/search"
import type { VersionedItem } from "../lib/types"

type Props = {
  apiBaseURL: string
  apiPath: string
  title: string
  typed: boolean
}

type RunResult = {
  passed: boolean
  engine: string
  detail: string
  error: string | null
}

type TemplateResult = {
  output: string
  error: string | null
}

export function VersionedEditorPage({ apiBaseURL, apiPath, title, typed }: Props) {
  const [items, setItems] = useState<VersionedItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string>("LLM")
  const [testInput, setTestInput] = useState(() => localStorage.getItem(`${apiPath}:testInput`) ?? "")
  const [query, setQuery] = useState(() => localStorage.getItem(`${apiPath}:query`) ?? "")
  const [queryResults, setQueryResults] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [templateResult, setTemplateResult] = useState<TemplateResult | null>(null)
  const [codeContent, setCodeContent] = useState("")
  const [runLoading, setRunLoading] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLInputElement>(null)

  const loadItems = useCallback(async () => {
    const data = await getJSON<{ items: VersionedItem[] }>(`${apiBaseURL}${apiPath}`)
    const list = data.items ?? []
    setItems(list)
    setActiveId((prev) => prev ?? (list.length > 0 ? list[0].id : null))
  }, [apiBaseURL, apiPath])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const active = items.find((i) => i.id === activeId) ?? items[0] ?? null
  const latest =
    ((active?.versions || []).find((v) => v.version === active?.currentVersion) || {}).content || ""

  useEffect(() => {
    setSelectedType(active?.type || "LLM")
    setCodeContent(latest)
    setRunResult(null)
    setTemplateResult(null)
    setQueryResults(null)
  }, [active?.id, latest])

  useEffect(() => { setQueryResults(null) }, [query])
  useEffect(() => { localStorage.setItem(`${apiPath}:testInput`, testInput) }, [apiPath, testInput])
  useEffect(() => { localStorage.setItem(`${apiPath}:query`, query) }, [apiPath, query])

  const types = ["LLM", "Regex", "CustomJavaScript", "CustomPython"]

  async function onNew() {
    const created = await getJSON<VersionedItem>(`${apiBaseURL}${apiPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: selectedType, name: "Untitled", description: "", content: "" }),
    })
    setItems((prev) => [created, ...prev])
    setActiveId(created.id)
  }

  async function onSave() {
    if (!active) return
    const updated = await getJSON<VersionedItem>(`${apiBaseURL}${apiPath}/${active.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: selectedType,
        name: nameRef.current?.value ?? active.name,
        description: descRef.current?.value ?? active.description,
        content: codeContent,
      }),
    })
    setItems((prev) => prev.map((i) => (i.id === active.id ? updated : i)))
  }

  async function onDelete() {
    if (!active) return
    const confirmed = window.confirm(`Delete "${active.name}"?`)
    if (!confirmed) return
    await getJSON(`${apiBaseURL}${apiPath}/${active.id}`, { method: "DELETE" })
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== active.id)
      setActiveId(next.length > 0 ? next[0].id : null)
      return next
    })
  }

  async function onActivateVersion(itemId: string, version: number) {
    const confirmed = window.confirm(`Set v${version} as the active version?`)
    if (!confirmed) return
    const updated = await getJSON<VersionedItem>(`${apiBaseURL}${apiPath}/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restoreVersion: version }),
    })
    setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)))
  }

  async function onRunCode() {
    const code = codeContent
    setRunLoading(true)
    setRunResult(null)
    setTemplateResult(null)
    try {
      if (!typed) {
        const resolvedQuery = await fetchFormattedSearchResults(apiBaseURL, query)
        setQueryResults(resolvedQuery)
        const result = await getJSON<TemplateResult>(`${apiBaseURL}/api/run-template`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, text: testInput, query: resolvedQuery }),
        })
        setTemplateResult(result)
      } else {
        const result = await getJSON<RunResult>(`${apiBaseURL}/api/run-guardrail`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: selectedType, code, text: testInput }),
        })
        setRunResult(result)
      }
    } catch (err) {
      if (!typed) {
        setTemplateResult({ output: "", error: String(err) })
      } else {
        setRunResult({ passed: false, engine: "", detail: "", error: String(err) })
      }
    } finally {
      setRunLoading(false)
    }
  }

  function contentLabel(): string {
    switch (selectedType) {
      case "CustomJavaScript": return "JavaScript Script"
      case "CustomPython":     return "Python Script"
      case "Regex":            return "Regex Pattern"
      case "LLM":              return "Rubric Prompt"
      default:                 return "Content"
    }
  }

  function contentHint(): string | null {
    switch (selectedType) {
      case "CustomJavaScript": return "input.text"
      case "CustomPython":     return `input["text"]`
      case "Regex":            return "output"
      case "LLM":              return "{{text}}"
      default:                 return null
    }
  }

  const finalPrompt = useMemo(() => {
    if (typed) return null
    return codeContent
      .replaceAll("{{query}}", "<<query results>>")
      .replaceAll("{{text}}", testInput)
  }, [typed, codeContent, testInput])

  function runSummaryText(): string {
    if (!runResult) return ""
    if (runResult.error) return `Error: ${runResult.error}`
    return `passed: ${runResult.passed}\nengine: ${runResult.engine}`
  }

  return (
    <main className="editor-layout">
      <section className="card scroll-pane">
        <div className="section-row">
          <h2>{title}</h2>
          <button type="button" onClick={onNew}>New</button>
        </div>

        <div className="item-list">
          {items.map((i) => (
            <button
              className={`item-card ${active?.id === i.id ? "active" : ""}`}
              key={i.id}
              onClick={() => setActiveId(i.id)}
            >
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
            <button type="button" onClick={onSave}>Save</button>
            <button type="button" onClick={onDelete}>Delete</button>
          </div>
        </div>

        {typed ? (
          <label>
            Type
            <select
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value); setRunResult(null) }}
            >
              {types.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
        ) : null}

        <label>
          Name
          <input ref={nameRef} defaultValue={active?.name || ""} key={`name-${active?.id}`} />
        </label>

        <label>
          Description
          <input ref={descRef} defaultValue={active?.description || ""} key={`desc-${active?.id}`} />
        </label>

        <label>
          {contentLabel()}
          {contentHint() ? <small className="content-hint">{contentHint()}</small> : null}
          <textarea
            key={`code-${active?.id}`}
            rows={18}
            value={codeContent}
            onChange={(e) => setCodeContent(e.target.value)}
          />
        </label>

        <div className="run-section">
          {!typed ? (
            <label>
              Query
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter query — replaces {{query}} in the template"
              />
            </label>
          ) : null}
          <label>
            Test input text
            <input
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder={typed ? "Enter text to test the guardrail against" : "Enter text — replaces {{text}} in the template"}
            />
          </label>
          <button type="button" onClick={onRunCode} disabled={runLoading}>
            {runLoading ? "Running…" : "Run"}
          </button>
          {!typed && templateResult !== null ? (
            <label>
              Output
              <textarea
                rows={8}
                readOnly
                value={templateResult.error ? `Error: ${templateResult.error}` : templateResult.output}
                placeholder="(no output)"
                className={templateResult.error ? "run-result-error" : ""}
              />
            </label>
          ) : null}
          {typed && runResult !== null ? (
            <>
              <label>
                Output
                <textarea
                  rows={3}
                  readOnly
                  value={runResult.error ? "" : runResult.detail}
                  placeholder="(no output)"
                />
              </label>
              <label>
                Result
                <textarea
                  rows={3}
                  readOnly
                  value={runSummaryText()}
                  className={runResult.error ? "run-result-error" : runResult.passed ? "run-result-pass" : "run-result-fail"}
                />
              </label>
            </>
          ) : null}
        </div>

        {finalPrompt !== null ? (
          <label>
            Final prompt
            <textarea rows={8} readOnly value={finalPrompt} placeholder="(type a query or input text to preview the interpolated prompt)" />
          </label>
        ) : null}

        <p className="meta">Click a version in the history panel to make it active.</p>
      </section>

      <section className="card scroll-pane">
        <h2>Version history</h2>
        <div className="hint">Click anywhere in a version card to confirm and make that version active.</div>

        <div className="history-list">
          {(active?.versions || [])
            .slice()
            .sort((a, b) => b.version - a.version)
            .map((v) => (
              <button
                type="button"
                className="history-card restore-version-card"
                key={v.version}
                onClick={() => active && onActivateVersion(active.id, v.version)}
              >
                <h3>
                  v{v.version}
                  {active?.currentVersion === v.version ? (
                    <span className="badge active-version-badge">Active</span>
                  ) : null}
                </h3>
                <small>{new Date(v.updatedAt).toLocaleString()}</small>
                <p>{v.content}</p>
              </button>
            ))}
        </div>
      </section>
    </main>
  )
}
