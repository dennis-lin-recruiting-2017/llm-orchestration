import { Typography } from "@mui/material"
import { HomeContentPage } from "./HomeContentPage"

export function OverviewPage() {
  return (
    <HomeContentPage
      eyebrow="LLM Orchestration"
      title="Overview"
      cards={[
        {
          title: "Workflow flow",
          body: "A workflow receives a request, resolves retrieval context when needed, applies input guardrails, renders the active prompt template, calls the configured local model provider, applies output guardrails, and records the full execution trace.",
        },
        {
          title: "Prompt template change management",
          body: "Prompt templates are versioned artifacts. Teams can draft changes, save immutable versions, promote a known-good version to active, and inspect exactly which prompt version was used for each workflow run.",
        },
        {
          title: "Guardrail change management",
          body: "Input and output guardrails follow the same versioned model. Regex, JavaScript, Python, and LLM-based checks can evolve independently while workflows continue to point at the active approved version.",
        },
        {
          title: "Workflow composition",
          body: "Workflows bind one prompt template with ordered input and output guardrails. This keeps policy, prompting, retrieval, and model execution explicit instead of burying behavior inside application code.",
        },
        {
          title: "Auditability",
          body: "Workflow logs preserve request data, rendered prompts, guardrail verdicts, model output, timings, provider metadata, and version references so behavior can be explained after the fact.",
        },
        {
          title: "Testability and velocity",
          body: "Because prompts and guardrails are isolated, versioned, and runnable through the UI, teams can test changes before promotion, compare behavior across versions, debug failures faster, and ship safer iterations without redeploying core workflow code.",
        },
      ]}
    >
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        This application demonstrates a self-hosted orchestration layer for building governed LLM workflows. Instead of treating an LLM call as a single opaque step, the system breaks the request lifecycle into explicit, inspectable stages: retrieval, input validation, prompt rendering, model inference, output validation, and logging.
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        The workflow is designed around change management. Prompt templates and guardrails are not one-off strings hidden in source code; they are managed as versioned configuration. Each save creates a new version, and workflows use the active version, which makes it possible to improve behavior deliberately while preserving a record of previous behavior.
      </Typography>
      <Typography color="text.secondary">
        That versioned model matters most when teams need to tune safety rules, adjust instructions, or respond to production findings. A guardrail can be tightened, a prompt can be clarified, and a workflow can adopt the approved active version without losing traceability into what changed, when it changed, and which version handled a given request.
      </Typography>
    </HomeContentPage>
  )
}
