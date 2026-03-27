export function HowToWorkflowLogsPage() {
  return (
    <section className="content-shell">
      <header className="hero">
        <p className="eyebrow">How to Use</p>
        <h1>Workflow Logs</h1>
        <p className="lede">
          Inspect every request processed by the orchestrator, including guardrail outcomes
          and the full request and response bodies.
        </p>
      </header>

      <div className="sample-grid">
        <article className="card">
          <h2>Reading the log table</h2>
          <p className="meta">
            Each row shows the request ID, timestamp, prompt template name, and the
            version that was active at the time of the call.
          </p>
        </article>

        <article className="card">
          <h2>Viewing request detail</h2>
          <p className="meta">
            Click a row to open the detail panel. It shows the full request body,
            each guardrail verdict, and the final response from the model.
          </p>
        </article>

        <article className="card">
          <h2>Debugging failed guardrails</h2>
          <p className="meta">
            Expand the input or output guardrail sections to see the pass/fail status
            and the detail message returned by each guardrail engine.
          </p>
        </article>
      </div>
    </section>
  )
}
