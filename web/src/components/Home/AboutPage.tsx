export function AboutPage() {
  return (
    <section className="content-shell">
      <header className="hero">
        <p className="eyebrow">LLM Orchestration</p>
        <h1>About the Author</h1>
        <p className="lede">
          This was created by Dennis Lin.
          <br />
          <br />
          Please send any comments, questions, or feedback you may have by <a href="mailto:dennis.lin@dhcs.ca.gov">by email</a>.
        </p>
      </header>

      <div className="sample-grid">
        <article className="card">
          <h2>Project background</h2>
          <p className="meta">
            A brief history of why this orchestration layer was built and the problems
            it was designed to solve.
          </p>
        </article>

        <article className="card">
          <h2>Design decisions</h2>
          <p className="meta">
            Key architectural choices including the versioning model, guardrail pipeline
            ordering, and the decision to support local LLM providers.
          </p>
        </article>

        <article className="card">
          <h2>Contact</h2>
          <p className="meta">
            Links to the project repository, issue tracker, and the author's profile
            for questions and contributions.
          </p>
        </article>
      </div>
    </section>
  )
}
