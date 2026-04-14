import { Link } from "@mui/material"
import { HomeContentPage } from "./HomeContentPage"

export function AboutPage() {
  return (
    <HomeContentPage
      eyebrow="LLM Orchestration"
      title="About the Author"
      cards={[
        { title: "Project background", body: "A brief history of why this orchestration layer was built and the problems it was designed to solve." },
        { title: "Design decisions", body: "Key architectural choices including the versioning model, guardrail pipeline ordering, and support for local LLM providers." },
        { title: "Contact", body: "Links to the project repository, issue tracker, and author profile for questions and contributions." },
      ]}
    >
      This was created by Dennis Lin. Please send any comments, questions, or feedback you may have <Link href="mailto:dennis.lin@dhcs.ca.gov">by email</Link>.
    </HomeContentPage>
  )
}
