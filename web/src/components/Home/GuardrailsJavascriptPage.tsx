export function GuardrailsJavascriptPage() {
  return (
    <section className="content-shell">
      <header className="hero">
        <p className="eyebrow">How to Use</p>
        <h1>Input / Output Guardrails (Javascript)</h1>
        <p className="lede">
          Write a JavaScript snippet that inspects the request or response text and returns
          a pass/fail result. The script reads the text from the <code>input.text</code> or{" "}
          <code>output</code> variable and must return <code>true</code> (pass) or{" "}
          <code>false</code> (fail).
        </p>
      </header>

      <div className="sample-grid">
        <article className="card">
          <h2>Creating a JS guardrail</h2>
          <p className="meta">
            Navigate to Input or Output Guardrails, click New, choose the Javascript type,
            and write a function that receives the text payload and returns a boolean.
          </p>
        </article>

        <article className="card">
          <h2>Script contract</h2>
          <p className="meta">
            The script has access to two variables: <code>input</code> (an object
            where <code>input.text</code> holds the request text) and{" "}
            <code>output</code> (the response text string). The script must return{" "}
            <code>true</code> or <code>false</code>. Throwing an error is treated as a fail.
          </p>
        </article>

        <article className="card">
          <h2>Use cases</h2>
          <p className="meta">
            Regex matching, length limits, keyword blocklists, JSON schema validation,
            or any deterministic rule that can be expressed in a few lines of code.
          </p>
        </article>
      </div>
    </section>
  )
}
