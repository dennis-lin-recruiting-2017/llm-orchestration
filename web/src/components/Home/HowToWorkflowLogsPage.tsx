import { HomeContentPage } from "./HomeContentPage"

export function HowToWorkflowLogsPage() {
  return (
    <HomeContentPage
      eyebrow="How to Use"
      title="Workflow Logs"
      cards={[
        { title: "Reading the log table", body: "Each row shows the request ID, timestamp, prompt template name, and the version that was active at the time of the call." },
        { title: "Viewing request detail", body: "Click a row to open the detail panel. It shows the full request body, each guardrail verdict, and the final response from the model." },
        { title: "Debugging failed guardrails", body: "Expand the input or output guardrail sections to see the pass/fail status and detail returned by each guardrail engine." },
      ]}
    >
      Inspect every request processed by the orchestrator, including guardrail outcomes and the full request and response bodies.
    </HomeContentPage>
  )
}
