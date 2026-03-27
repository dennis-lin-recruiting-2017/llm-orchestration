import { useEffect, useMemo, useState } from "react"
import { getJSON } from "./lib/api"
import { AboutPage } from "./components/Home/AboutPage"
import { AppShell } from "./components/AppShell"
import { DrawerNav } from "./components/DrawerNav"
import { GuardrailsJavascriptPage } from "./components/Home/GuardrailsJavascriptPage"
import { GuardrailsLLMPage } from "./components/Home/GuardrailsLLMPage"
import { GuardrailsPythonPage } from "./components/Home/GuardrailsPythonPage"
import { HowToPromptTemplatesPage } from "./components/Home/HowToPromptTemplatesPage"
import { HowToWorkflowLogsPage } from "./components/Home/HowToWorkflowLogsPage"
import { HowToWorkflowsPage } from "./components/Home/HowToWorkflowsPage"
import { LLMConnectionsPage } from "./components/LLMConnectionsPage"
import { OverviewPage } from "./components/Home/OverviewPage"
import { TopNav } from "./components/TopNav"
import { VersionedEditorPage } from "./components/VersionedEditorPage"
import { WorkflowLogViewerPage } from "./components/WorkflowLogViewerPage"
import { WorkflowsPage } from "./components/WorkflowsPage"
import { WorkspacePage } from "./components/WorkspacePage"
import { normalizeRoute } from "./lib/routes"
import type {
  AppConfig,
  AppRoute,
  Document,
  LLMConnections,
  VersionedItem,
  Workflow,
} from "./lib/types"

function currentRoute(): AppRoute {
  return normalizeRoute(window.location.pathname)
}

const demoDocuments: Document[] = [
  { id: 1, title: "Router policy and delegation", category: "routing", body: "Use a lightweight router to delegate user requests to the right specialist workflow while preserving traceable decisions.", distance: 0.1024 },
  { id: 2, title: "Memory and session state", category: "memory", body: "Persist compact session facts and retrieval summaries so downstream calls can use context without replaying the whole transcript.", distance: 0.1932 },
]
const demoTemplates: VersionedItem[] = [
  { id: "tpl-system-1", name: "General system prompt", description: "Base instruction block for the main orchestrator.", currentVersion: 2, versions: [{ version: 1, content: "You are the orchestration controller. Route work to the right tool.", updatedAt: "2026-03-26T00:00:00Z" }, { version: 2, content: "You are the orchestration controller. Route work to the right tool, preserve user intent, and return concise grounded answers.", updatedAt: "2026-03-27T00:00:00Z" }], updatedAt: "2026-03-27T00:00:00Z" },
]
const demoInputs: VersionedItem[] = [
  { id: "igr-1", type: "Regex", name: "PII redaction check", description: "Prevent unsafe prompt inputs from including sensitive personal info.", currentVersion: 2, versions: [{ version: 1, content: "Reject or redact raw SSNs, credit cards, and passwords before prompt assembly.", updatedAt: "2026-03-27T00:00:00Z" }, { version: 2, content: "Regex example: /(\\b\\d{3}-\\d{2}-\\d{4}\\b)|([A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,})/i", updatedAt: "2026-03-29T00:00:00Z" }], updatedAt: "2026-03-29T00:00:00Z" },
]
const demoOutputs: VersionedItem[] = [
  { id: "ogr-1", type: "LLM", name: "Citation enforcement", description: "Require sources for grounded claims.", currentVersion: 1, versions: [{ version: 1, content: "LLM rubric: verify the answer makes supported factual claims only and flags unsupported statements.", updatedAt: "2026-03-29T00:00:00Z" }], updatedAt: "2026-03-29T00:00:00Z" },
]
const demoWorkflows: Workflow[] = [
  { id: "1f0f2b3c-9c52-6a10-a111-1234567890ab", name: "Default assistant workflow", description: "Starter workflow wiring together guardrails and the main prompt.", promptTemplateId: "tpl-system-1", inputGuardrailIds: ["igr-1"], outputGuardrailIds: ["ogr-1"], updatedAt: "2026-03-30T00:00:00Z" },
]
const demoConnections: LLMConnections = { provider: "LMStudio", lmstudio: { baseURL: "http://127.0.0.1:1234", model: "local-model" }, ollama: { baseURL: "http://127.0.0.1:11434", model: "llama3.1" } }

export default function App() {
  const initialRoute = useMemo<AppRoute>(() => currentRoute(), [])
  const [route, setRoute] = useState<AppRoute>(initialRoute)
  const [query, setQuery] = useState("orchestration")
  const [apiBaseURL, setApiBaseURL] = useState("http://127.0.0.1:8081")

  useEffect(() => {
    getJSON<AppConfig>("/config.json")
      .then((cfg) => setApiBaseURL(cfg.apiBaseURL))
      .catch(() => {/* keep default */})
  }, [])

  useEffect(() => {
    const onPopState = () => setRoute(currentRoute())
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  function onNavigate(path: AppRoute) {
    if (path === route) return
    window.history.pushState({}, "", path)
    setRoute(path)
  }

  // Pages rendered inside the Home drawer layout
  const isHomeTab = route === "/" || route.startsWith("/how-to-use/") || route === "/about"

  let page
  if (route === "/") {
    page = <OverviewPage />
  } else if (route === "/how-to-use/prompt-templates") {
    page = <HowToPromptTemplatesPage />
  } else if (route === "/how-to-use/guardrails-llm") {
    page = <GuardrailsLLMPage />
  } else if (route === "/how-to-use/guardrails-javascript") {
    page = <GuardrailsJavascriptPage />
  } else if (route === "/how-to-use/guardrails-python") {
    page = <GuardrailsPythonPage />
  } else if (route === "/how-to-use/workflows") {
    page = <HowToWorkflowsPage />
  } else if (route === "/how-to-use/workflow-logs") {
    page = <HowToWorkflowLogsPage />
  } else if (route === "/about") {
    page = <AboutPage />
  } else if (route === "/workspace") {
    page = <WorkspacePage cfg={{ webBaseURL: window.location.origin, apiBaseURL: "http://127.0.0.1:8081" }} query={query} mode="vector" loading={false} results={demoDocuments} documents={demoDocuments} onQueryChange={setQuery} onSearch={() => undefined} onChip={setQuery} />
  } else if (route === "/prompt-templates") {
    page = <VersionedEditorPage apiBaseURL={apiBaseURL} apiPath="/api/templates" title="Prompt templates" typed={false} />
  } else if (route === "/input-guardrails") {
    page = <VersionedEditorPage apiBaseURL={apiBaseURL} apiPath="/api/input-guardrails" title="Input guardrails" typed={true} />
  } else if (route === "/output-guardrails") {
    page = <VersionedEditorPage apiBaseURL={apiBaseURL} apiPath="/api/output-guardrails" title="Output guardrails" typed={true} />
  } else if (route === "/workflows") {
    page = <WorkflowsPage workflows={demoWorkflows} active={demoWorkflows[0]} inputs={demoInputs} outputs={demoOutputs} templates={demoTemplates} apiBaseURL={apiBaseURL} status="Source demo view" />
  } else if (route === "/llm-connections") {
    page = <LLMConnectionsPage connections={demoConnections} />
  } else {
    page = <WorkflowLogViewerPage apiBaseURL={apiBaseURL} />
  }

  const content = isHomeTab ? (
    <div className="app-shell">
      <DrawerNav route={route} onNavigate={onNavigate} />
      {page}
    </div>
  ) : page

  return (
    <AppShell route={route} onNavigate={onNavigate} topNav={<TopNav route={route} onNavigate={onNavigate} />}>
      {content}
    </AppShell>
  )
}
