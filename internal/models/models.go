package models

import "time"

type Document struct {
	ID        int64     `json:"id"`
	Title     string    `json:"title"`
	Category  string    `json:"category"`
	Body      string    `json:"body"`
	Embedding []float64 `json:"embedding,omitempty"`
	Distance  float64   `json:"distance,omitempty"`
}

type ItemVersion struct {
	Version   int       `json:"version"`
	Content   string    `json:"content"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type VersionedItem struct {
	ID             string        `json:"id"`
	Type           string        `json:"type,omitempty"`
	Name           string        `json:"name"`
	Description    string        `json:"description"`
	CurrentVersion int           `json:"currentVersion"`
	Versions       []ItemVersion `json:"versions"`
	UpdatedAt      time.Time     `json:"updatedAt"`
}

type Workflow struct {
	ID                 string    `json:"id"`
	Name               string    `json:"name"`
	Description        string    `json:"description"`
	PromptTemplateID   string    `json:"promptTemplateId"`
	InputGuardrailIDs  []string  `json:"inputGuardrailIds"`
	OutputGuardrailIDs []string  `json:"outputGuardrailIds"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

type WorkflowInvokeRequest struct {
	Input    map[string]any `json:"input"`
	Text     string         `json:"text"`
	Query    string         `json:"query"`
	RawQuery string         `json:"rawQuery"`
}

// WorkflowMetadata contains timing and connection info for a single invocation.
type WorkflowMetadata struct {
	QueryTimeMs       float64 `json:"queryTimeMs"`
	InferenceTimeMs   float64 `json:"inferenceTimeMs"`
	Model             string  `json:"model"`
	InferenceEndpoint string  `json:"inferenceEndpoint"`
}

// GuardrailDebugResult is the per-guardrail entry in the debug section.
type GuardrailDebugResult struct {
	Passed      bool    `json:"passed"`
	Engine      string  `json:"engine"`
	Detail      string  `json:"detail"`
	DurationMs  float64 `json:"durationMs"`
}

// WorkflowDebug holds diagnostic data that is useful for troubleshooting.
type WorkflowDebug struct {
	RAGResults       []string                        `json:"ragResults"`
	InputGuardrails  map[string]GuardrailDebugResult `json:"inputGuardrails"`
	OutputGuardrails map[string]GuardrailDebugResult `json:"outputGuardrails"`
}

type WorkflowInvokeResponse struct {
	WorkflowID            string           `json:"workflowId"`
	PromptTemplateID      string           `json:"promptTemplateId"`
	PromptTemplateVersion int              `json:"promptTemplateVersion,omitempty"`
	InputGuardrails       []string         `json:"inputGuardrails"`
	OutputGuardrails      []string         `json:"outputGuardrails"`
	InputTypes            []string         `json:"inputGuardrailTypes,omitempty"`
	OutputTypes           []string         `json:"outputGuardrailTypes,omitempty"`
	Status                string           `json:"status"`
	Echo                  string           `json:"echo"`
	LLMOutput             string           `json:"llmOutput"`
	Metadata              WorkflowMetadata `json:"metadata"`
	Debug                 WorkflowDebug    `json:"debug"`
}

type AppConfig struct {
	APIBaseURL string `json:"apiBaseURL"`
	WebBaseURL string `json:"webBaseURL"`
}


type ProviderConnection struct {
	BaseURL string `json:"baseURL"`
	Model   string `json:"model"`
}

type LLMConnections struct {
	Provider  string             `json:"provider"`
	LMStudio  ProviderConnection `json:"lmstudio"`
	Ollama    ProviderConnection `json:"ollama"`
	UpdatedAt time.Time          `json:"updatedAt"`
}


type GuardrailLogEntry struct {
	RequestID     string `json:"requestId"`
	WorkflowID    string `json:"workflowId"`
	GuardrailID   string `json:"guardrailId"`
	GuardrailType string `json:"guardrailType"`
	Passed        bool   `json:"passed"`
	Engine        string `json:"engine"`
	Detail        string `json:"detail"`
	CreatedAt     string `json:"createdAt"`
}

type WorkflowLogListItem struct {
	RequestID             string `json:"requestId"`
	RequestTimestamp      string `json:"requestTimestamp"`
	PromptTemplateID      string `json:"promptTemplateId"`
	PromptTemplateName    string `json:"promptTemplateName"`
	PromptTemplateVersion int    `json:"promptTemplateVersion"`
}

type WorkflowLogDetail struct {
	RequestID             string              `json:"requestId"`
	WorkflowID            string              `json:"workflowId"`
	PromptTemplateID      string              `json:"promptTemplateId"`
	PromptTemplateName    string              `json:"promptTemplateName"`
	PromptTemplateVersion int                 `json:"promptTemplateVersion"`
	RequestTimestamp      string              `json:"requestTimestamp"`
	RequestBody           string              `json:"requestBody"`
	RawQuery              string              `json:"rawQuery"`
	Query                 string              `json:"query"`
	Text                  string              `json:"text"`
	FinalPrompt           string              `json:"finalPrompt"`
	LLMOutput             string              `json:"llmOutput"`
	SearchDurationUs      int64               `json:"searchDurationUs"`
	InferenceDurationUs   int64               `json:"inferenceDurationUs"`
	InferenceEndpoint     string              `json:"inferenceEndpoint"`
	InferenceModel        string              `json:"inferenceModel"`
	InputGuardrails       []GuardrailLogEntry `json:"inputGuardrails"`
	OutputGuardrails      []GuardrailLogEntry `json:"outputGuardrails"`
	ResponseBody          string              `json:"responseBody"`
	ResponseTimestamp     string              `json:"responseTimestamp"`
}
