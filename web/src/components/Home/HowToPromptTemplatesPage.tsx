import { HomeContentPage } from "./HomeContentPage"

export function HowToPromptTemplatesPage() {
  return (
    <HomeContentPage
      eyebrow="How to Use"
      title="Prompt Templates"
      cards={[
        { title: "Creating a template", body: "Navigate to Prompt Templates, click New, and author the system prompt content. Save to create version 1." },
        { title: "Versioning", body: "Every save creates a new immutable version. Click a version number to restore it as the active version used by workflows." },
        { title: "Assigning to a workflow", body: "Open a workflow and select the template from the Prompt Template dropdown. The active version is used automatically at request time." },
      ]}
    >
      Create and version system prompts that are injected into workflow requests sent to the LLM.
    </HomeContentPage>
  )
}
