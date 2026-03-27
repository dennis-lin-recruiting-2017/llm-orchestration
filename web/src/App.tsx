import { useEffect, useMemo, useState } from "react"
import { AppShell } from "./components/AppShell"
import { DrawerNav } from "./components/DrawerNav"
import { LLMConnectionsPage } from "./components/LLMConnectionsPage"
import { SampleLandingPage } from "./components/SampleLandingPage"
import { TopNav } from "./components/TopNav"
import { VersionedEditorPage } from "./components/VersionedEditorPage"
import { WorkflowLogsPage } from "./components/WorkflowLogsPage"
import { WorkflowsPage } from "./components/WorkflowsPage"
import { WorkspacePage } from "./components/WorkspacePage"
import { normalizeRoute } from "./lib/routes"
import type {
  AppRoute,
  Document,
  LLMConnections,
  VersionedItem,
  Workflow,
  WorkflowLogDetail,
  WorkflowLogListItem,
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
const demoLogList: WorkflowLogListItem[] = [{ requestId: "req-1743010001", requestTimestamp: "2026-03-26T19:12:10Z", promptTemplateId: "tpl-system-1", promptTemplateName: "General system prompt", promptTemplateVersion: 2 }]
const demoLogDetail: WorkflowLogDetail = { requestId: "req-1743010001", workflowId: "1f0f2b3c-9c52-6a10-a111-1234567890ab", promptTemplateId: "tpl-system-1", promptTemplateName: "General system prompt", promptTemplateVersion: 2, requestTimestamp: "2026-03-26T19:12:10Z", requestBody: '{"text":"Explain retrieval-augmented generation"}', inputGuardrails: [], outputGuardrails: [], responseBody: '{"status":"accepted"}', responseTimestamp: "2026-03-26T19:12:11Z" }

export default function App() {
  const initialRoute = useMemo<AppRoute>(() => currentRoute(), [])
  const [route, setRoute] = useState<AppRoute>(initialRoute)
  const [query, setQuery] = useState("orchestration")

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

  let content
  if (route === "/" || route.startsWith("/sample/")) {
    content = (
      <div className="app-shell">
        <DrawerNav route={route} onNavigate={onNavigate} />
        <SampleLandingPage route={route} />
      </div>
    )
  } else if (route === "/workspace") {
    content = <WorkspacePage cfg={{ webBaseURL: window.location.origin, apiBaseURL: "http://127.0.0.1:8081" }} query={query} mode="vector" loading={false} results={demoDocuments} documents={demoDocuments} onQueryChange={setQuery} onSearch={() => undefined} onChip={setQuery} />
  } else if (route === "/prompt-templates") {
    content = <VersionedEditorPage title="Prompt templates" typed={false} status="Click a version and confirm to restore it as active." items={demoTemplates} active={demoTemplates[0]} />
  } else if (route === "/input-guardrails") {
    content = <VersionedEditorPage title="Input guardrails" typed={true} status="Click a version and confirm to restore it as active." items={demoInputs} active={demoInputs[0]} />
  } else if (route === "/output-guardrails") {
    content = <VersionedEditorPage title="Output guardrails" typed={true} status="Click a version and confirm to restore it as active." items={demoOutputs} active={demoOutputs[0]} />
  } else if (route === "/workflows") {
    content = <WorkflowsPage workflows={demoWorkflows} active={demoWorkflows[0]} inputs={demoInputs} outputs={demoOutputs} templates={demoTemplates} apiBaseURL="http://127.0.0.1:8081" status="Source demo view" />
  } else if (route === "/llm-connections") {
    content = <LLMConnectionsPage connections={demoConnections} />
  } else {
    content = <WorkflowLogsPage logs={demoLogList} selected={demoLogDetail} />
  }

  return <AppShell route={route} onNavigate={onNavigate} topNav={<TopNav route={route} onNavigate={onNavigate} />}>{content}</AppShell>
}
