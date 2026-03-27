export function HowToWorkflowsPage() {
  return (
    <section className="content-shell">
      <header className="hero">
        <p className="eyebrow">How to Use</p>
        <h1>Workflows</h1>
        <p className="lede">
          Assemble a prompt template and one or more guardrails into a named workflow
          that is exposed as a single REST endpoint.
        </p>
      </header>

      <div className="sample-grid">
        <article className="card">
          <h2>Creating a workflow</h2>
          <p className="meta">
            Open the Workflows page, click New, give it a name and description, then
            assign a prompt template and any input or output guardrails.
          </p>
        </article>

        <article className="card">
          <h2>Calling the endpoint</h2>
          <p className="meta">
            POST to <code>/ai/v1/workflow/&#123;id&#125;</code> with a JSON body. The
            orchestrator runs the guardrails and template in order and returns the
            model response.
          </p>
        </article>

        <article className="card">
          <h2>Active versions</h2>
          <p className="meta">
            The workflow always uses the currently active version of the assigned
            prompt template and guardrails. Promote a new version to update behavior
            without changing the endpoint URL.
          </p>
        </article>
      </div>
    </section>
  )
}
