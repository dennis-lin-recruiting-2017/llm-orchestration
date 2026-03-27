import type { AppRoute } from "../lib/types"

const items: Array<{ path: AppRoute; label: string }> = [
  { path: "/", label: "Home" },
  { path: "/workspace", label: "Workspace" },
  { path: "/llm-connections", label: "LLM Connections" },
  { path: "/prompt-templates", label: "Prompt Templates" },
  { path: "/input-guardrails", label: "Input Guardrails" },
  { path: "/output-guardrails", label: "Output Guardrails" },
  { path: "/workflows", label: "Workflows" },
  { path: "/workflow-logs", label: "Workflow Logs" },
]

export function TopNav({
  route,
  onNavigate,
}: {
  route: AppRoute
  onNavigate: (path: AppRoute) => void
}) {
  return (
    <header className="topbar">
      {items.map((item) => (
        <button
          key={item.path}
          type="button"
          className={`navlink ${route === item.path ? "active" : ""}`}
          onClick={() => onNavigate(item.path)}
        >
          {item.label}
        </button>
      ))}
    </header>
  )
}
