import { HomeContentPage } from "./HomeContentPage"

export function GuardrailsLLMPage() {
  return (
    <HomeContentPage
      eyebrow="How to Use"
      title="Input / Output Guardrails (LLM)"
      cards={[
        { title: "Creating an LLM guardrail", body: "Navigate to Input or Output Guardrails, click New, choose the LLM type, and write a rubric prompt that returns a pass/fail judgment." },
        { title: "Input vs output", body: "Input guardrails run before the prompt is sent to the model. Output guardrails run on the model response before it is returned to the caller." },
        { title: "Viewing results", body: "The Workflow Logs page shows per-request guardrail outcomes including the rubric verdict and any detail returned by the evaluator model." },
      ]}
    >
      Use a secondary LLM call to evaluate whether a request or response meets a defined rubric before allowing it to proceed. The request must be structured so that the LLM response returns true or false.
    </HomeContentPage>
  )
}
