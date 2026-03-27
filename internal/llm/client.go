// Package llm provides a minimal OpenAI-compatible HTTP client used to call
// local inference servers such as LM Studio and Ollama.
package llm

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Message is a single chat turn.
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// chatRequest is the request body sent to /v1/chat/completions.
type chatRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

// chatResponse is the subset of the OpenAI response that we use.
type chatResponse struct {
	Choices []struct {
		Message Message `json:"message"`
	} `json:"choices"`
}

// DefaultClient is a shared HTTP client with a generous timeout for local
// inference which may be slow on the first call.
var DefaultClient = &http.Client{Timeout: 120 * time.Second}

// Chat sends messages to the OpenAI-compatible chat completions endpoint at
// baseURL and returns the content of the first choice.
//
// baseURL should be the root of the server, e.g. "http://127.0.0.1:1234".
// The path /v1/chat/completions is appended automatically.
func Chat(baseURL, model string, messages []Message) (string, error) {
	reqBody, err := json.Marshal(chatRequest{Model: model, Messages: messages})
	if err != nil {
		return "", fmt.Errorf("llm: marshal request: %w", err)
	}

	resp, err := DefaultClient.Post(
		baseURL+"/v1/chat/completions",
		"application/json",
		bytes.NewReader(reqBody),
	)
	if err != nil {
		return "", fmt.Errorf("llm: POST /v1/chat/completions: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("llm: unexpected status %s", resp.Status)
	}

	var cr chatResponse
	if err := json.NewDecoder(resp.Body).Decode(&cr); err != nil {
		return "", fmt.Errorf("llm: decode response: %w", err)
	}
	if len(cr.Choices) == 0 {
		return "", fmt.Errorf("llm: response contained no choices")
	}
	return cr.Choices[0].Message.Content, nil
}
