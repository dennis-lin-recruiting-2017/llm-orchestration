package guardrails

import (
	"fmt"
	"regexp"

	"github.com/dop251/goja"

	"llm-orchestration/internal/interp"
	"llm-orchestration/internal/models"
)

type Executor interface {
	Execute(item models.VersionedItem, input map[string]any, output string) (bool, string, error)
}

type Runtime struct{}

func (Runtime) Execute(item models.VersionedItem, input map[string]any, output string) (bool, string, error) {
	code := activeCode(item)
	switch item.Type {
	case "Regex":
		return executeRegex(code, output)
	case "CustomJavaScript":
		return executeGoja(code, input, output)
	case "CustomPython":
		return executeGPython(code, input, output)
	case "LLM", "":
		return true, "llm-guardrail-stub", nil
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
func (Runtime) ExecuteDetail(item models.VersionedItem, input map[string]any, output string) (RunResult, error) {
	code := activeCode(item)
	switch item.Type {
	case "Regex":
		passed, engine, err := executeRegex(code, output)
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
		return RunResult{Passed: true, Engine: "llm-guardrail-stub", Detail: "(LLM guardrails are not evaluated in test mode)"}, nil
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
