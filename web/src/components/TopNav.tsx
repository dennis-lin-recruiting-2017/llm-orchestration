import { Box, Tab, Tabs } from "@mui/material"
import type { AppRoute } from "../lib/types"

const items: Array<{ path: AppRoute; label: string }> = [
  { path: "/", label: "Home" },
  { path: "/workspace", label: "RAG" },
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
  const value = items.findIndex((item) => item.path === route)

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
      <Tabs
        value={value < 0 ? false : value}
        onChange={(_, next) => onNavigate(items[next].path)}
        variant="scrollable"
        scrollButtons="auto"
      >
        {items.map((item) => (
          <Tab key={item.path} label={item.label} />
        ))}
      </Tabs>
    </Box>
  )
}
