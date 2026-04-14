import { HomeContentPage } from "./HomeContentPage"

export function HowToWorkflowsPage() {
  return (
    <HomeContentPage
      eyebrow="How to Use"
      title="Workflows"
      cards={[
        { title: "Creating a workflow", body: "Open the Workflows page, click New, give it a name and description, then assign a prompt template and any input or output guardrails." },
        { title: "Calling the endpoint", body: "POST to /ai/v1/workflow/{id} with a JSON body. The orchestrator runs the guardrails and template in order and returns the model response." },
        { title: "Active versions", body: "The workflow always uses the currently active version of the assigned prompt template and guardrails." },
      ]}
    >
      Assemble a prompt template and one or more guardrails into a named workflow that is exposed as a single REST endpoint.
    </HomeContentPage>
  )
}
