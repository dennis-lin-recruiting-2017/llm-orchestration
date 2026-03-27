import type { Workflow, VersionedItem } from "../lib/types"

type Props = {
  workflows: Workflow[]
  active: Workflow | null
  inputs: VersionedItem[]
  outputs: VersionedItem[]
  templates: VersionedItem[]
  apiBaseURL: string
  status: string
}

export function WorkflowsPage({
  workflows,
  active,
  inputs,
  outputs,
  templates,
  apiBaseURL,
  status,
}: Props) {
  const url = active?.id
    ? `${apiBaseURL}/ai/v1/workflow/${active.id}`
    : `${apiBaseURL}/ai/v1/workflow/{workflow_id}`

  return (
    <main className="workflow-layout">
      <section className="card scroll-pane">
        <div className="section-row">
          <h2>Workflows</h2>
          <button>New</button>
        </div>

        <div className="item-list">
          {workflows.map((w) => (
            <button className={`item-card ${active?.id === w.id ? "active" : ""}`} key={w.id}>
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
            <button>Save</button>
            <button>Delete</button>
          </div>
        </div>

        <div className="meta mono">{url}</div>

        <label>
          Workflow ID
          <input readOnly defaultValue={active?.id || ""} />
        </label>

        <label>
          Name
          <input defaultValue={active?.name || ""} />
        </label>

        <label>
          Description
          <input defaultValue={active?.description || ""} />
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
          <select defaultValue={active?.promptTemplateId || ""}>
            <option value="">Select a prompt template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
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

        <p className="meta">{status}</p>
      </section>
    </main>
  )
}
