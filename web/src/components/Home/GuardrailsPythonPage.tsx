import { HomeContentPage } from "./HomeContentPage"

export function GuardrailsPythonPage() {
  return (
    <HomeContentPage
      eyebrow="How to Use"
      title="Input / Output Guardrails (Python)"
      cards={[
        { title: "Creating a Python guardrail", body: "Navigate to Input or Output Guardrails, click New, choose the Python type, and write a function that receives the text payload and returns a result dict." },
        { title: "Script contract", body: "The script has access to input['text'] and output. The script must return True or False. Unhandled exceptions are treated as a fail." },
        { title: "Use cases", body: "PII detection with spaCy or regex, toxicity scoring, language detection, or any rule that benefits from the Python data-science ecosystem." },
      ]}
    >
      Write a Python snippet that inspects the request or response text and returns a pass/fail result.
    </HomeContentPage>
  )
}
