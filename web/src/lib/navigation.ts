export type NavNode = {
  label: string
  path?: string
  children?: NavNode[]
}

export const drawerNavigation: NavNode[] = [
  { label: "Home", path: "/sample/dashboard" },
  { label: "Getting started", path: "/sample/getting-started" },
  {
    label: "Samples",
    children: [
      { label: "Chat playground", path: "/sample/chat-playground" },
      { label: "Retrieval demo", path: "/sample/retrieval-demo" },
    ],
  },
  {
    label: "Admin",
    children: [
      { label: "Users", path: "/sample/admin-users" },
      { label: "Audit", path: "/sample/admin-audit" },
    ],
  },
  {
    label: "Application",
    children: [
      { label: "Workspace", path: "/workspace" },
      { label: "Prompt templates", path: "/prompt-templates" },
      { label: "Input guardrails", path: "/input-guardrails" },
      { label: "Output guardrails", path: "/output-guardrails" },
      { label: "Workflows", path: "/workflows" },
      { label: "LLM Connections", path: "/llm-connections" },
      { label: "Workflow Logs", path: "/workflow-logs" },
    ],
  },
]
