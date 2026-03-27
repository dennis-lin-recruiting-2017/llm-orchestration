export type NavNode = {
  label: string
  path?: string
  children?: NavNode[]
}

export const drawerNavigation: NavNode[] = [
  { label: "Overview", path: "/" },
  {
    label: "How to Use",
    children: [
      { label: "Prompt Templates", path: "/how-to-use/prompt-templates" },
      { label: "Input / Output Guardrails (LLM)", path: "/how-to-use/guardrails-llm" },
      { label: "Input / Output Guardrails (Javascript)", path: "/how-to-use/guardrails-javascript" },
      { label: "Input / Output Guardrails (Python)", path: "/how-to-use/guardrails-python" },
      { label: "Workflows", path: "/how-to-use/workflows" },
      { label: "Workflow Logs", path: "/how-to-use/workflow-logs" },
    ],
  },
  { label: "About the Author", path: "/about" },
]
