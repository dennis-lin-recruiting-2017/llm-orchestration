import type { WorkflowLogDetail, WorkflowLogListItem } from "../lib/types"

type Props = {
  logs: WorkflowLogListItem[]
  selected: WorkflowLogDetail | null
  onRefresh?: () => void
  onSelect?: (requestId: string) => void
}

function GuardrailRows({ items }: { items: WorkflowLogDetail["inputGuardrails"] }) {
  if (!items?.length) return <div className="meta">No entries</div>

  return (
    <>
      {items.map((g) => (
        <article className="history-card" key={g.guardrailId + g.createdAt}>
          <h3>
            {g.guardrailId} <span className="badge">{g.guardrailType}</span>
          </h3>
          <div className={g.passed ? "pass" : "fail"}>{g.passed ? "Passed" : "Failed"}</div>
          <div className="meta">Engine: {g.engine}</div>
          <p>{g.detail}</p>
        </article>
      ))}
    </>
  )
}

export function WorkflowLogsPage({ logs, selected, onRefresh, onSelect }: Props) {
  return (
    <main className="log-layout">
      <section className="card scroll-pane">
        <div className="section-row">
          <h2>Workflow logs</h2>
          <button onClick={onRefresh}>Refresh</button>
        </div>

        <table className="log-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Request timestamp</th>
              <th>Prompt template name</th>
              <th>Prompt template version</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((item) => (
              <tr className={`log-row ${selected?.requestId === item.requestId ? "active" : ""}`} key={item.requestId} onClick={() => onSelect?.(item.requestId)}>
                <td className="mono">{item.requestId}</td>
                <td>{item.requestTimestamp}</td>
                <td>{item.promptTemplateName || item.promptTemplateId || ""}</td>
                <td>{item.promptTemplateVersion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card detail-scroll">
        <div className="section-row">
          <h2>Log details</h2>
        </div>

        {selected ? (
          <>
            <div className="meta mono">{selected.requestId}</div>

            <details className="collapse">
              <summary>{"{{query}}"} value</summary>
              <div className="collapse-body">
                <div className="pre">{selected.rawQuery || selected.query || "(none)"}</div>
              </div>
            </details>

            <details className="collapse">
              <summary>{"{{text}}"} value</summary>
              <div className="collapse-body">
                <div className="pre">{selected.text || "(none)"}</div>
              </div>
            </details>

            <details className="collapse">
              <summary>Query results</summary>
              <div className="collapse-body">
                <div className="pre">{selected.query || "(none)"}</div>
              </div>
            </details>

            <details className="collapse">
              <summary>Final prompt</summary>
              <div className="collapse-body">
                <div className="pre">{selected.finalPrompt || "(none)"}</div>
              </div>
            </details>

            <details className="collapse">
              <summary>LLM output</summary>
              <div className="collapse-body">
                <div className="pre">{selected.llmOutput || "(none)"}</div>
              </div>
            </details>

            <details className="collapse">
              <summary>Timing &amp; inference details</summary>
              <div className="collapse-body">
                <table className="log-table">
                  <tbody>
                    <tr>
                      <td>Search duration</td>
                      <td>{((selected.searchDurationUs ?? 0) / 1000).toFixed(2)} ms</td>
                    </tr>
                    <tr>
                      <td>Inference duration</td>
                      <td>{((selected.inferenceDurationUs ?? 0) / 1000).toFixed(2)} ms</td>
                    </tr>
                    <tr>
                      <td>Inference endpoint</td>
                      <td className="mono">{selected.inferenceEndpoint || "(none)"}</td>
                    </tr>
                    <tr>
                      <td>Model</td>
                      <td className="mono">{selected.inferenceModel || "(none)"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </details>

            <details className="collapse">
              <summary>Request body</summary>
              <div className="collapse-body">
                <div className="pre">{selected.requestBody}</div>
              </div>
            </details>

            <details className="collapse">
              <summary>Input guardrails</summary>
              <div className="collapse-body">
                <GuardrailRows items={selected.inputGuardrails} />
              </div>
            </details>

            <details className="collapse">
              <summary>Output guardrails</summary>
              <div className="collapse-body">
                <GuardrailRows items={selected.outputGuardrails} />
              </div>
            </details>

            <details className="collapse">
              <summary>Response body</summary>
              <div className="collapse-body">
                <div className="pre">{selected.responseBody}</div>
              </div>
            </details>
          </>
        ) : (
          <p className="meta">Select a request from the table to view details.</p>
        )}
      </section>
    </main>
  )
}
