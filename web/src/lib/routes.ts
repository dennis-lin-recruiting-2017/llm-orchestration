import type { AppRoute } from "./types"

export const APP_ROUTES: AppRoute[] = [
  "/",
  "/workspace",
  "/prompt-templates",
  "/input-guardrails",
  "/output-guardrails",
  "/workflows",
  "/llm-connections",
  "/workflow-logs",
  "/how-to-use/prompt-templates",
  "/how-to-use/guardrails-llm",
  "/how-to-use/guardrails-javascript",
  "/how-to-use/guardrails-python",
  "/how-to-use/workflows",
  "/how-to-use/workflow-logs",
  "/about",
]

export function normalizeRoute(pathname: string): AppRoute {
  return APP_ROUTES.includes(pathname as AppRoute) ? (pathname as AppRoute) : "/"
}
