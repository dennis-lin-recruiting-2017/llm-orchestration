export function HowToPromptTemplatesPage() {
  return (
    <section className="content-shell">
      <header className="hero">
        <p className="eyebrow">How to Use</p>
        <h1>Prompt Templates</h1>
        <p className="lede">
          Create and version system prompts that are injected into workflow requests sent to the LLM.
        </p>
      </header>

      <div className="sample-grid">
        <article className="card">
          <h2>Creating a template</h2>
          <p className="meta">
            Navigate to Prompt Templates, click New, and author the system prompt content.
            Save to create version 1.
          </p>
        </article>

        <article className="card">
          <h2>Versioning</h2>
          <p className="meta">
            Every save creates a new immutable version. Click a version number to restore
            it as the active version used by workflows.
          </p>
        </article>

        <article className="card">
          <h2>Assigning to a workflow</h2>
          <p className="meta">
            Open a workflow and select the template from the Prompt Template dropdown.
            The active version is used automatically at request time.
          </p>
        </article>
      </div>
    </section>
  )
}
