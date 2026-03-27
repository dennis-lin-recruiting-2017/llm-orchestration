import { samplePageMeta } from "../lib/samplePages"

export function SampleLandingPage({ route }: { route: string }) {
  const meta = samplePageMeta[route] ?? samplePageMeta["/"]

  return (
    <section className="content-shell">
      <header className="hero">
        <p className="eyebrow">Sample application shell</p>
        <h1>{meta.title}</h1>
        <p className="lede">{meta.body}</p>
      </header>

      <div className="sample-grid">
        <article className="card">
          <h2>Nested navigation</h2>
          <p className="meta">
            The left drawer supports top-level items and one nested level of child pages.
          </p>
        </article>

        <article className="card">
          <h2>Sample pages</h2>
          <p className="meta">
            Use the sample pages as placeholders for future product sections.
          </p>
        </article>

        <article className="card">
          <h2>Composable layout</h2>
          <p className="meta">
            This shell can be extended with breadcrumbs, filters, tabs, and richer dashboards later.
          </p>
        </article>
      </div>
    </section>
  )
}
