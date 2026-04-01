import { useCallback, useEffect, useRef, useState } from "react"
import { getJSON } from "../lib/api"
import { fetchFormattedSearchResults } from "../lib/search"
import type { Workflow, VersionedItem } from "../lib/types"

type Props = { apiBaseURL: string }

type RunResult = { llmOutput: string; error: string | null }

export function WorkflowsPage({ apiBaseURL }: Props) {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [inputs, setInputs] = useState<VersionedItem[]>([])
  const [outputs, setOutputs] = useState<VersionedItem[]>([])
  const [templates, setTemplates] = useState<VersionedItem[]>([])
  const [query, setQuery] = useState("")
  const [runResult, setRunResult] = useState<RunResult | null>(null)

  useEffect(() => { setRunResult(null) }, [query])
  const [runLoading, setRunLoading] = useState(false)

  const nameRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLInputElement>(null)

  const loadAll = useCallback(async () => {
    const [wfData, inputsData, outputsData, templatesData] = await Promise.all([
      getJSON<{ items: Workflow[] }>(`${apiBaseURL}/api/workflows`),
      getJSON<{ items: VersionedItem[] }>(`${apiBaseURL}/api/input-guardrails`),
      getJSON<{ items: VersionedItem[] }>(`${apiBaseURL}/api/output-guardrails`),
      getJSON<{ items: VersionedItem[] }>(`${apiBaseURL}/api/templates`),
    ])
    const wfList = wfData.items ?? []
    setWorkflows(wfList)
    setActiveId((prev) => prev ?? (wfList.length > 0 ? wfList[0].id : null))
    setInputs(inputsData.items ?? [])
    setOutputs(outputsData.items ?? [])
    setTemplates(templatesData.items ?? [])
  }, [apiBaseURL])

  useEffect(() => { loadAll() }, [loadAll])

  const active = workflows.find((w) => w.id === activeId) ?? workflows[0] ?? null

  useEffect(() => { setRunResult(null) }, [activeId])

  async function onNew() {
    const created = await getJSON<Workflow>(`${apiBaseURL}/api/workflows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Untitled workflow", description: "" }),
    })
    setWorkflows((prev) => [created, ...prev])
    setActiveId(created.id)
  }

  async function onSave() {
    if (!active) return
    const updated = await getJSON<Workflow>(`${apiBaseURL}/api/workflows/${active.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nameRef.current?.value ?? active.name,
        description: descRef.current?.value ?? active.description,
        promptTemplateId: active.promptTemplateId,
        inputGuardrailIds: active.inputGuardrailIds,
        outputGuardrailIds: active.outputGuardrailIds,
      }),
    })
    setWorkflows((prev) => prev.map((w) => (w.id === active.id ? updated : w)))
  }

  async function onDelete() {
    if (!active) return
    if (!window.confirm(`Delete "${active.name}"?`)) return
    await getJSON(`${apiBaseURL}/api/workflows/${active.id}`, { method: "DELETE" })
    setWorkflows((prev) => {
      const next = prev.filter((w) => w.id !== active.id)
      setActiveId(next.length > 0 ? next[0].id : null)
      return next
    })
  }

  async function onRun() {
    if (!active) return
    setRunLoading(true)
    setRunResult(null)
    try {
      const resolvedQuery = await fetchFormattedSearchResults(apiBaseURL, query)
      const resp = await getJSON<{ llmOutput?: string; echo?: string }>(
        `${apiBaseURL}/ai/v1/workflow/${active.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawQuery: query, query: resolvedQuery, text: query }),
        }
      )
      setRunResult({ llmOutput: resp.llmOutput ?? resp.echo ?? "", error: null })
    } catch (err) {
      setRunResult({ llmOutput: "", error: String(err) })
    } finally {
      setRunLoading(false)
    }
  }

  const url = active?.id
    ? `${apiBaseURL}/ai/v1/workflow/${active.id}`
    : `${apiBaseURL}/ai/v1/workflow/{workflow_id}`

  return (
    <main className="workflow-layout">
      <section className="card scroll-pane">
        <div className="section-row">
          <h2>Workflows</h2>
          <button type="button" onClick={onNew}>New</button>
        </div>

        <div className="item-list">
          {workflows.map((w) => (
            <button
              type="button"
              className={`item-card ${active?.id === w.id ? "active" : ""}`}
              key={w.id}
              onClick={() => setActiveId(w.id)}
            >
              <h3>{w.name}</h3>
              <div className="meta">{w.description}</div>
              <small className="mono">{w.id}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-row">
          <h2>Workflow editor</h2>
          <div className="inline-actions">
            <button type="button" onClick={onSave}>Save</button>
            <button type="button" onClick={onDelete}>Delete</button>
          </div>
        </div>

        <div className="meta mono">{url}</div>

        <label>
          Workflow ID
          <input readOnly defaultValue={active?.id || ""} key={`id-${active?.id}`} />
        </label>

        <label>
          Name
          <input ref={nameRef} defaultValue={active?.name || ""} key={`name-${active?.id}`} />
        </label>

        <label>
          Description
          <input ref={descRef} defaultValue={active?.description || ""} key={`desc-${active?.id}`} />
        </label>

        <label>Input guardrails</label>
        <div className="check-list selector-scroll">
          {inputs.map((g) => (
            <label className="check-item" key={g.id}>
              <input type="checkbox" defaultChecked={(active?.inputGuardrailIds || []).includes(g.id)} />
              <div>
                <strong>{g.name}</strong>
                <div className="meta">{g.description}</div>
                <div className="badge">{g.type || ""}</div>
              </div>
            </label>
          ))}
        </div>

        <label>
          Prompt template
          <select defaultValue={active?.promptTemplateId || ""} key={`tpl-${active?.id}`}>
            <option value="">Select a prompt template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>

        <label>Output guardrails</label>
        <div className="check-list selector-scroll">
          {outputs.map((g) => (
            <label className="check-item" key={g.id}>
              <input type="checkbox" defaultChecked={(active?.outputGuardrailIds || []).includes(g.id)} />
              <div>
                <strong>{g.name}</strong>
                <div className="meta">{g.description}</div>
                <div className="badge">{g.type || ""}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="run-section">
          <label>
            Query
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter query — replaces {{query}} in the prompt template"
            />
          </label>
          <button type="button" onClick={onRun} disabled={runLoading || !active}>
            {runLoading ? "Running…" : "Run"}
          </button>
          {runResult !== null ? (
            <label>
              Output
              <textarea
                rows={8}
                readOnly
                value={runResult.error ? `Error: ${runResult.error}` : runResult.llmOutput}
                placeholder="(no output)"
                className={runResult.error ? "run-result-error" : ""}
              />
            </label>
          ) : null}
        </div>
      </section>
    </main>
  )
}
