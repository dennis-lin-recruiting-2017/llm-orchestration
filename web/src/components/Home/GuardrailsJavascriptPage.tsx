import { HomeContentPage } from "./HomeContentPage"

export function GuardrailsJavascriptPage() {
  return (
    <HomeContentPage
      eyebrow="How to Use"
      title="Input / Output Guardrails (Javascript)"
      cards={[
        { title: "Creating a JS guardrail", body: "Navigate to Input or Output Guardrails, click New, choose the Javascript type, and write a function that receives the text payload and returns a boolean." },
        { title: "Script contract", body: "The script has access to input.text and output. The script must return true or false. Throwing an error is treated as a fail." },
        { title: "Use cases", body: "Regex matching, length limits, keyword blocklists, JSON schema validation, or any deterministic rule that can be expressed in a few lines of code." },
      ]}
    >
      Write a JavaScript snippet that inspects the request or response text and returns a pass/fail result.
    </HomeContentPage>
  )
}
