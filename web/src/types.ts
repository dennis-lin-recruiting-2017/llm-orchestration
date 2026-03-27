export type Document = { id: number; title: string; category: string; body: string; distance?: number }
export type Version = { version: number; content: string; updatedAt: string }
export type VersionedItem = {
  id: string
  type?: string
  name: string
  description: string
  currentVersion: number
  versions: Version[]
  updatedAt: string
}
export type Workflow = {
  id: string
  name: string
  description: string
  promptTemplateId: string
  inputGuardrailIds: string[]
  outputGuardrailIds: string[]
  updatedAt: string
}
export type ProviderConnection = { baseURL: string; model: string }
export type LLMConnections = {
  provider: string
  lmstudio: ProviderConnection
  ollama: ProviderConnection
}
export type WorkflowLogListItem = {
  requestId: string
  requestTimestamp: string
  promptTemplateId: string
  promptTemplateName: string
  promptTemplateVersion: number
}
export type GuardrailLogEntry = {
  requestId: string
  workflowId: string
  guardrailId: string
  guardrailType: string
  passed: boolean
  engine: string
  detail: string
  createdAt: string
}
export type WorkflowLogDetail = {
  requestId: string
  workflowId: string
  promptTemplateId: string
  promptTemplateName: string
  promptTemplateVersion: number
  requestTimestamp: string
  requestBody: string
  inputGuardrails: GuardrailLogEntry[]
  outputGuardrails: GuardrailLogEntry[]
  responseBody: string
  responseTimestamp: string
}
export type AppConfig = { apiBaseURL: string; webBaseURL: string }
