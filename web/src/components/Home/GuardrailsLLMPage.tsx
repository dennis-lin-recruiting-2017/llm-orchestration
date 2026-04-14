import { Typography } from "@mui/material"
import { HomeContentPage } from "./HomeContentPage"

export function GuardrailsLLMPage() {
  return (
    <HomeContentPage
      eyebrow="How to Use"
      title="Input / Output Guardrails"
      sections={[
        {
          title: "Types of Guardrails",
          cards: [
            {
              title: "LLM guardrails",
              body: "Use an evaluator model when the rule needs judgment: policy compliance, relevance, citation quality, tone, or prompt-injection detection. Write a rubric prompt that returns a clear true or false verdict, with optional detail for debugging.",
            },
            {
              title: "Regex guardrails",
              body: "Use Regex guardrails for fast deterministic matching. They are a good fit for blocking or detecting known patterns such as SSNs, email addresses, account IDs, forbidden terms, required citation formats, or simple output structure checks.",
            },
            {
              title: "JavaScript guardrails",
              body: "Use JavaScript when the rule is deterministic but needs more logic than a pattern match. Scripts can inspect input.text and output, combine multiple checks, validate JSON shape, enforce length limits, or apply keyword and field-level rules.",
            },
            {
              title: "Python guardrails",
              body: "Use Python when validation benefits from the Python ecosystem or richer text processing. Python guardrails can inspect input['text'] and output, run scoring logic, perform language checks, call local libraries, or evaluate structured content.",
            },
          ],
        },
        {
          title: "How Guardrails Work",
          cards: [
            {
              title: "Input vs output",
              body: "Input guardrails run before prompt rendering and model inference, so they protect the workflow from unsafe or off-topic requests. Output guardrails run after inference, so they check the model response before it is returned to the caller.",
            },
            {
              title: "Change management",
              body: "Guardrails are versioned. Save changes as new immutable versions, test them with sample text, and promote an approved version to active. Workflows continue using the active version, and logs show which guardrail version participated in a request.",
            },
            {
              title: "Composing guardrails",
              body: "A workflow can include multiple input and output guardrails. Combine inexpensive deterministic checks first with LLM-based review where judgment is needed, so the workflow is easier to reason about and cheaper to run.",
            },
            {
              title: "Viewing results",
              body: "The Workflow Logs page shows each guardrail run, pass/fail status, engine type, duration, and detail. Use those logs to tune rules, compare behavior across versions, and explain why a request was blocked or allowed.",
            },
          ],
        },
      ]}
    >
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Guardrails are explicit checks that run around a workflow. They let you separate policy and quality controls from the prompt template itself, so each rule can be authored, tested, versioned, and reviewed independently.
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        The system supports four guardrail styles. Regex is best for simple pattern matching, JavaScript is best for lightweight deterministic logic, Python is best for richer validation or local library support, and LLM guardrails are best when the decision requires semantic judgment.
      </Typography>
      <Typography color="text.secondary">
        Use input guardrails to decide whether a request should enter the workflow, and output guardrails to decide whether the model response is safe and useful enough to return. Because guardrails are versioned, teams can improve protections without losing traceability into what changed.
      </Typography>
    </HomeContentPage>
  )
}
