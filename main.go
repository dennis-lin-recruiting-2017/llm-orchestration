package main

import (
	"embed"

	"llm-orchestration/internal/app"
)

//go:embed all:web/dist all:db/seed.db all:db/seed.json all:db/templates.json all:db/input_guardrails.json all:db/output_guardrails.json all:db/workflows.json all:db/llm_connections.json
var embeddedFiles embed.FS

func main() {
	app.RunWithFS(embeddedFiles)
}
