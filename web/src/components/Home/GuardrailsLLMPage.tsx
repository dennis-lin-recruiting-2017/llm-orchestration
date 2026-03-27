export function GuardrailsLLMPage() {
  return (
    <section className="content-shell">
      <header className="hero">
        <p className="eyebrow">How to Use</p>
        <h1>Input / Output Guardrails (LLM)</h1>
        <p className="lede">
          Use a secondary LLM call to evaluate whether a request or response meets a
          defined rubric before allowing it to proceed.  The request be structured so that the LLM response
          must return "true" or "false".
        </p>
      </header>

      <div className="sample-grid">
        <article className="card">
          <h2>Creating an LLM guardrail</h2>
          <p className="meta">
            Navigate to Input or Output Guardrails, click New, choose the LLM type,
            and write a rubric prompt that returns a pass/fail judgment. Use{" "}
            <code>{"{{text}}"}</code> in the prompt to insert the request or response text.
          </p>
        </article>

        <article className="card">
          <h2>Input vs output</h2>
          <p className="meta">
            Input guardrails run before the prompt is sent to the model. Output guardrails
            run on the model response before it is returned to the caller.
          </p>
        </article>

        <article className="card">
          <h2>Viewing results</h2>
          <p className="meta">
            The Workflow Logs page shows per-request guardrail outcomes including the
            rubric verdict and any detail returned by the evaluator model.
          </p>
        </article>
      </div>
    </section>
  )
}
