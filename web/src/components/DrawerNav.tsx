import { Box, Divider, List, ListItemButton, ListItemText, Toolbar, Typography } from "@mui/material"
import type { AppRoute } from "../lib/types"

type Props = {
  route: AppRoute
  onNavigate: (path: AppRoute) => void
  onNavigateComplete?: () => void
}

const sections: Array<{
  label: string
  items: Array<{ label: string; path: AppRoute }>
}> = [
  {
    label: "Home",
    items: [
      { label: "Overview", path: "/" },
      { label: "Prompt Templates", path: "/how-to-use/prompt-templates" },
      { label: "LLM Guardrails", path: "/how-to-use/guardrails-llm" },
      { label: "JavaScript Guardrails", path: "/how-to-use/guardrails-javascript" },
      { label: "Python Guardrails", path: "/how-to-use/guardrails-python" },
      { label: "Workflows", path: "/how-to-use/workflows" },
      { label: "Workflow Logs", path: "/how-to-use/workflow-logs" },
      { label: "About the Author", path: "/about" },
    ],
  },
  {
    label: "Application",
    items: [
      { label: "RAG", path: "/workspace" },
      { label: "LLM Connections", path: "/llm-connections" },
      { label: "Prompt Templates", path: "/prompt-templates" },
      { label: "Input Guardrails", path: "/input-guardrails" },
      { label: "Output Guardrails", path: "/output-guardrails" },
      { label: "Workflows", path: "/workflows" },
      { label: "Workflow Logs", path: "/workflow-logs" },
    ],
  },
]

export const routeLabels = sections
  .flatMap((section) => section.items)
  .reduce<Record<string, string>>((labels, item) => {
    labels[item.path] = item.label
    return labels
  }, {})

export function DrawerNav({ route, onNavigate, onNavigateComplete }: Props) {
  function handleNavigate(path: AppRoute) {
    onNavigate(path)
    onNavigateComplete?.()
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Toolbar>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>LLM Orchestration</Typography>
      </Toolbar>
      <Divider />
      {sections.map((section) => (
        <Box key={section.label} sx={{ py: 1 }}>
          <Typography variant="overline" color="text.secondary" sx={{ px: 2, display: "block" }}>
            {section.label}
          </Typography>
          <List dense disablePadding>
            {section.items.map((item) => (
              <ListItemButton key={item.path} selected={route === item.path} onClick={() => handleNavigate(item.path)}>
                <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontSize: "0.9rem" } } }} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      ))}
    </Box>
  )
}
