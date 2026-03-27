export function GuardrailsPythonPage() {
  return (
    <section className="content-shell">
      <header className="hero">
        <p className="eyebrow">How to Use</p>
        <h1>Input / Output Guardrails (Python)</h1>
        <p className="lede">
          Write a Python snippet that inspects the request or response text and returns
          a pass/fail result. The script reads the text from the <code>input["text"]</code> or{" "}
          <code>output</code> variable and must return <code>True</code> (pass) or{" "}
          <code>False</code> (fail).
        </p>
      </header>

      <div className="sample-grid">
        <article className="card">
          <h2>Creating a Python guardrail</h2>
          <p className="meta">
            Navigate to Input or Output Guardrails, click New, choose the Python type,
            and write a function that receives the text payload and returns a result dict.
          </p>
        </article>

        <article className="card">
          <h2>Script contract</h2>
          <p className="meta">
            The script has access to two variables: <code>input</code> (a dict where{" "}
            <code>input["text"]</code> holds the request text) and <code>output</code>{" "}
            (the response text string). The script must return <code>True</code> or{" "}
            <code>False</code>. Unhandled exceptions are treated as a fail.
          </p>
        </article>

        <article className="card">
          <h2>Use cases</h2>
          <p className="meta">
            PII detection with spaCy or regex, toxicity scoring, language detection,
            or any rule that benefits from the Python data-science ecosystem.
          </p>
        </article>
      </div>
    </section>
  )
}
