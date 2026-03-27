package guardrails

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/dop251/goja"
	gpycompile "github.com/go-python/gpython/compile"
	"github.com/go-python/gpython/py"
	_ "github.com/go-python/gpython/stdlib"

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
		return executeGPython(code)
	case "LLM", "":
		return true, "llm-guardrail-stub", nil
	default:
		return false, "", fmt.Errorf("unsupported guardrail type: %s", item.Type)
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

func executeGPython(code string) (bool, string, error) {
	// gpython integration: validate and compile Python guardrail code in-process.
	// Wrap the snippet in a function so snippets starting with "return ..."
	// remain valid Python when compiled in exec mode.
	wrapped := strings.Join([]string{
		"def __guardrail__(input, output):",
		indentPython(code),
		"result = __guardrail__(input, output)",
	}, "\n")

	if _, err := gpycompile.Compile(wrapped, "<guardrail>", py.ExecMode, 0, true); err != nil {
		return false, "", err
	}
	return true, "gpython-compiled", nil
}

func indentPython(code string) string {
	lines := strings.Split(code, "\n")
	for i, line := range lines {
		if strings.TrimSpace(line) == "" {
			lines[i] = "    pass"
			continue
		}
		lines[i] = "    " + line
	}
	return strings.Join(lines, "\n")
}
