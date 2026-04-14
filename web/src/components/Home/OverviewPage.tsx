import { HomeContentPage } from "./HomeContentPage"

export function OverviewPage() {
  return (
    <HomeContentPage
      eyebrow="LLM Orchestration"
      title="Overview"
      cards={[
        { title: "Prompt templates", body: "Author and version system prompts that are injected into every workflow request." },
        { title: "Guardrails", body: "Validate inputs and outputs using LLM rubrics, regular expressions, or custom scripts." },
        { title: "Workflows", body: "Wire templates and guardrails together into named workflows exposed as a single endpoint." },
      ]}
    >
      This is a demo of a self-hosted orchestration layer for routing requests through prompt templates, guardrails, and local LLM providers. There are web forms to edit and manage each part of the process.
    </HomeContentPage>
  )
}
