package guardrails

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/dop251/goja"

	"llm-orchestration/internal/interp"
	"llm-orchestration/internal/llm"
	"llm-orchestration/internal/models"
)

type Executor interface {
	Execute(ctx context.Context, item models.VersionedItem, input map[string]any, output string) (bool, string, error)
}

// Runtime executes guardrails of all supported types.  ActiveLLMConn is called
// each time an LLM-type guardrail runs so that the latest saved connection
// settings are always used.
type Runtime struct {
	ActiveLLMConn func() (models.ProviderConnection, bool)
}

func (rt Runtime) Execute(ctx context.Context, item models.VersionedItem, input map[string]any, output string) (bool, string, error) {
	code := activeCode(item)
	switch item.Type {
	case "Regex":
		return executeRegex(code, textForLLM(input, output))
	case "CustomJavaScript":
		return executeGoja(code, input, output)
	case "CustomPython":
		return executeGPython(code, input, output)
	case "LLM", "":
		text := textForLLM(input, output)
		return rt.executeLLM(ctx, code, text)
	default:
		return false, "", fmt.Errorf("unsupported guardrail type: %s", item.Type)
	}
}

// RunResult holds the full output of a test execution including a human-readable detail string.
type RunResult struct {
	Passed bool
	Engine string
	Detail string
}

// ExecuteDetail runs the guardrail and returns a RunResult with a detail string
// describing the raw output — useful for the editor's test-run feature.
func (rt Runtime) ExecuteDetail(ctx context.Context, item models.VersionedItem, input map[string]any, output string) (RunResult, error) {
	code := activeCode(item)
	switch item.Type {
	case "Regex":
		passed, engine, err := executeRegex(code, textForLLM(input, output))
		if err != nil {
			return RunResult{}, err
		}
		detail := "no match"
		if !passed {
			detail = "matched"
		}
		return RunResult{Passed: passed, Engine: engine, Detail: detail}, nil
	case "CustomJavaScript":
		r, err := interp.RunJS(code, map[string]any{"input": input, "output": output})
		if err != nil {
			return RunResult{}, err
		}
		passed, _ := r.Value.(bool)
		if r.Value != nil {
			if b, ok := r.Value.(bool); ok {
				passed = b
			} else {
				passed = true
			}
		}
		return RunResult{Passed: passed, Engine: "goja", Detail: r.Raw}, nil
	case "CustomPython":
		r, err := interp.RunPython(code, map[string]any{"input": input, "output": output})
		if err != nil {
			return RunResult{}, err
		}
		passed, _ := r.Value.(bool)
		if r.Value != nil {
			if b, ok := r.Value.(bool); ok {
				passed = b
			} else {
				passed = true
			}
		}
		return RunResult{Passed: passed, Engine: "gpython", Detail: r.Raw}, nil
	case "LLM", "":
		text := textForLLM(input, output)
		passed, engine, err := rt.executeLLM(ctx, code, text)
		if err != nil {
			return RunResult{}, err
		}
		return RunResult{Passed: passed, Engine: engine, Detail: fmt.Sprintf("passed: %v", passed)}, nil
	default:
		return RunResult{}, fmt.Errorf("unsupported guardrail type: %s", item.Type)
	}
}

func activeCode(item models.VersionedItem) string {
	for _, v := range item.Versions {
		if v.Version == item.CurrentVersion {
			return v.Content
		}
	}
	return ""
}

func executeRegex(pattern, output string) (bool, string, error) {
	re, err := regexp.Compile(pattern)
	if err != nil {
		return false, "", err
	}
	return !re.MatchString(output), "regex", nil
}

func executeGoja(code string, input map[string]any, output string) (bool, string, error) {
	vm := goja.New()
	vm.Set("input", input)
	vm.Set("output", output)
	value, err := vm.RunString(code)
	if err != nil {
		return false, "", err
	}
	return value.ToBoolean(), "goja", nil
}

// textForLLM resolves the text that should be substituted into the rubric
// prompt.  For output guardrails the response text is passed as output; for
// input guardrails output is empty and the request text lives in input["text"].
func textForLLM(input map[string]any, output string) string {
	if output != "" {
		return output
	}
	if t, ok := input["text"].(string); ok {
		return t
	}
	return ""
}

// executeLLM fills {{text}} in the rubric prompt with text, sends it to the
// configured LLM, and interprets the reply as a boolean verdict.
// Replies of "true", "yes", "pass", or "1" (case-insensitive) are treated as
// passing; everything else is treated as failing.
func (rt Runtime) executeLLM(ctx context.Context, prompt, text string) (bool, string, error) {
	if rt.ActiveLLMConn == nil {
		return false, "llm", fmt.Errorf("no LLM connection configured")
	}
	conn, ok := rt.ActiveLLMConn()
	if !ok {
		return false, "llm", fmt.Errorf("no active LLM connection")
	}

	filled := strings.ReplaceAll(prompt, "{{text}}", text)
	reply, err := llm.Chat(ctx, conn.BaseURL, conn.Model, []llm.Message{
		{Role: "user", Content: filled},
	})
	if err != nil {
		return false, "llm", fmt.Errorf("LLM guardrail inference: %w", err)
	}

	verdict := strings.ToLower(strings.TrimSpace(reply))
	switch verdict {
	case "true", "yes", "pass", "1":
		return true, "llm", nil
	default:
		return false, "llm", nil
	}
}

func executeGPython(code string, input map[string]any, output string) (bool, string, error) {
	r, err := interp.RunPython(code, map[string]any{"input": input, "output": output})
	if err != nil {
		return false, "", err
	}
	passed, ok := r.Value.(bool)
	if !ok {
		// Treat any non-nil, non-false value as passing.
		passed = r.Value != nil
	}
	return passed, "gpython", nil
}
