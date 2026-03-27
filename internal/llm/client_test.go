package llm_test

import (
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"llm-orchestration/internal/llm"
)

// lmStudioBaseURL returns the LM Studio base URL, preferring the
// LM_STUDIO_BASE_URL environment variable and falling back to the default
// local address that LM Studio uses out of the box.
func lmStudioBaseURL() string {
	if u := os.Getenv("LM_STUDIO_BASE_URL"); u != "" {
		return u
	}
	return "http://127.0.0.1:1234"
}

// lmStudioModel returns the model identifier, preferring LM_STUDIO_MODEL and
// falling back to the project's default seed value.
func lmStudioModel() string {
	if m := os.Getenv("LM_STUDIO_MODEL"); m != "" {
		return m
	}
	return "local-model"
}

// requireLMStudio skips the test if the LM Studio server is not reachable.
// It uses a short timeout so the test suite does not stall in CI.
func requireLMStudio(t *testing.T, baseURL string) {
	t.Helper()
	probe := &http.Client{Timeout: 2 * time.Second}
	resp, err := probe.Get(baseURL + "/v1/models")
	if err != nil || resp.StatusCode < 200 || resp.StatusCode >= 300 {
		t.Skipf("LM Studio not reachable at %s — skipping inference test (set LM_STUDIO_BASE_URL to override)", baseURL)
	}
	resp.Body.Close()
}

// TestLMStudioInference sends a simple question to LM Studio and verifies that
// a non-empty answer is returned. The test is skipped automatically when LM
// Studio is not running so it does not break CI pipelines.
func TestLMStudioInference(t *testing.T) {
	baseURL := lmStudioBaseURL()
	model := lmStudioModel()

	requireLMStudio(t, baseURL)

	messages := []llm.Message{
		{Role: "user", Content: "What is 2+2? Reply with only the number."},
	}

	reply, err := llm.Chat(baseURL, model, messages)
	if err != nil {
		t.Fatalf("Chat() error: %v", err)
	}

	reply = strings.TrimSpace(reply)
	if reply == "" {
		t.Fatal("Chat() returned an empty reply")
	}

	t.Logf("LM Studio replied: %q", reply)
}
