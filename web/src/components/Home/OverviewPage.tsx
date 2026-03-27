export function OverviewPage() {
  return (
    <section className="content-shell">
      <header className="hero">
        <p className="eyebrow">LLM Orchestration</p>
        <h1>Overview</h1>
        <p className="lede">
          This is a demo of a self-hosted orchestration layer for routing requests through prompt templates,
          guardrails, and local LLM providers.  There are web forms to edit and manage each part of the process.
        </p>
      </header>

      <div className="sample-grid">
        <article className="card">
          <h2>Prompt templates</h2>
          <p className="meta">
            Author and version system prompts that are injected into every workflow request.
          </p>
        </article>

        <article className="card">
          <h2>Guardrails</h2>
          <p className="meta">
            Validate inputs and outputs using LLM rubrics, regular expressions, or custom scripts.
          </p>
        </article>

        <article className="card">
          <h2>Workflows</h2>
          <p className="meta">
            Wire templates and guardrails together into named workflows exposed as a single endpoint.
          </p>
        </article>
      </div>
    </section>
  )
}
