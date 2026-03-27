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
  "/sample/dashboard",
  "/sample/getting-started",
  "/sample/chat-playground",
  "/sample/retrieval-demo",
  "/sample/admin-users",
  "/sample/admin-audit",
]

export function normalizeRoute(pathname: string): AppRoute {
  return APP_ROUTES.includes(pathname as AppRoute) ? (pathname as AppRoute) : "/"
}
