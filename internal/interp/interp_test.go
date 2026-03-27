package interp_test

import (
	"testing"

	"llm-orchestration/internal/interp"
)

// ═══════════════════════════════════════════════════════════════════
// JavaScript tests  (goja — pure-Go ECMAScript 5.1)
// ═══════════════════════════════════════════════════════════════════

// TestJS_Bool shows how to define and call a JS function that returns a bool,
// then use the result as a Go bool via a type assertion.
func TestJS_Bool(t *testing.T) {
	script := `
		function isPriority(level) {
			return level === "high" || level === "critical";
		}
		return isPriority(priority);
	`
	r, err := interp.RunJS(script, map[string]any{"priority": "high"})
	if err != nil {
		t.Fatalf("RunJS error: %v", err)
	}

	// Retrieve the result as a Go bool.
	passed, ok := r.Value.(bool)
	if !ok {
		t.Fatalf("expected bool, got %T (%v)", r.Value, r.Value)
	}
	if !passed {
		t.Errorf("expected true for priority=high, got false")
	}
}

// TestJS_Int shows how to receive an integer result from JavaScript.
func TestJS_Int(t *testing.T) {
	script := `
		function wordCount(s) {
			return s.split(" ").length;
		}
		return wordCount(text);
	`
	r, err := interp.RunJS(script, map[string]any{"text": "the quick brown fox"})
	if err != nil {
		t.Fatalf("RunJS error: %v", err)
	}

	// goja exports JS numbers as float64; cast to int for comparison.
	switch v := r.Value.(type) {
	case float64:
		if int(v) != 4 {
			t.Errorf("expected 4, got %v", v)
		}
	case int64:
		if v != 4 {
			t.Errorf("expected 4, got %v", v)
		}
	default:
		t.Fatalf("unexpected type %T", r.Value)
	}
}

// TestJS_String shows how to receive a string result from JavaScript.
func TestJS_String(t *testing.T) {
	script := `
		function greet(name) {
			return "hello, " + name + "!";
		}
		return greet(username);
	`
	r, err := interp.RunJS(script, map[string]any{"username": "alice"})
	if err != nil {
		t.Fatalf("RunJS error: %v", err)
	}

	msg, ok := r.Value.(string)
	if !ok {
		t.Fatalf("expected string, got %T", r.Value)
	}
	if msg != "hello, alice!" {
		t.Errorf("expected %q, got %q", "hello, alice!", msg)
	}
}

// TestJS_ArgsAvailableAsGlobals demonstrates that every key in the args map
// is directly accessible inside the script as a global variable.
func TestJS_ArgsAvailableAsGlobals(t *testing.T) {
	script := `return x + y;`
	r, err := interp.RunJS(script, map[string]any{"x": 3, "y": 4})
	if err != nil {
		t.Fatalf("RunJS error: %v", err)
	}

	// In Go: pull the number out and use it however you like.
	switch v := r.Value.(type) {
	case float64:
		if int(v) != 7 {
			t.Errorf("expected 7, got %v", v)
		}
	case int64:
		if v != 7 {
			t.Errorf("expected 7, got %v", v)
		}
	default:
		t.Fatalf("unexpected type %T", r.Value)
	}
}

// TestJS_GuardrailPattern mirrors the real-world guardrail use case: a script
// that validates an input map and returns pass/fail.
func TestJS_GuardrailPattern(t *testing.T) {
	script := `
		function validate(input) {
			if (!input.topic)           return false;
			if (input.topic.length < 3) return false;
			var allowed = ["low", "medium", "high"];
			return allowed.indexOf(input.priority) !== -1;
		}
		return validate(input);
	`

	tests := []struct {
		name  string
		input map[string]any
		want  bool
	}{
		{"valid input", map[string]any{"topic": "billing", "priority": "high"}, true},
		{"missing topic", map[string]any{"priority": "high"}, false},
		{"bad priority", map[string]any{"topic": "billing", "priority": "urgent"}, false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			r, err := interp.RunJS(script, map[string]any{"input": tc.input})
			if err != nil {
				t.Fatalf("RunJS error: %v", err)
			}
			got, ok := r.Value.(bool)
			if !ok {
				t.Fatalf("expected bool, got %T", r.Value)
			}
			if got != tc.want {
				t.Errorf("input %v: expected %v, got %v", tc.input, tc.want, got)
			}
		})
	}
}

// ═══════════════════════════════════════════════════════════════════
// Python tests  (gpython — pure-Go CPython-compatible)
// ═══════════════════════════════════════════════════════════════════

// TestPython_Bool shows how to define and call a Python function that returns
// a bool, then retrieve it as a Go bool.
func TestPython_Bool(t *testing.T) {
	script := `
def is_priority(level):
    return level in ("high", "critical")

return is_priority(priority)
`
	r, err := interp.RunPython(script, map[string]any{"priority": "high"})
	if err != nil {
		t.Fatalf("RunPython error: %v", err)
	}

	// Retrieve the result as a Go bool.
	passed, ok := r.Value.(bool)
	if !ok {
		t.Fatalf("expected bool, got %T (%v)", r.Value, r.Value)
	}
	if !passed {
		t.Errorf("expected True for priority=high, got False")
	}
}

// TestPython_Int shows how to receive an integer result from Python.
func TestPython_Int(t *testing.T) {
	script := `
def word_count(s):
    return len(s.split())

return word_count(text)
`
	r, err := interp.RunPython(script, map[string]any{"text": "the quick brown fox"})
	if err != nil {
		t.Fatalf("RunPython error: %v", err)
	}

	n, ok := r.Value.(int64)
	if !ok {
		t.Fatalf("expected int64, got %T (%v)", r.Value, r.Value)
	}
	if n != 4 {
		t.Errorf("expected 4, got %d", n)
	}
}

// TestPython_String shows how to receive a string result from Python.
func TestPython_String(t *testing.T) {
	script := `
def greet(name):
    return "hello, " + name + "!"

return greet(username)
`
	r, err := interp.RunPython(script, map[string]any{"username": "alice"})
	if err != nil {
		t.Fatalf("RunPython error: %v", err)
	}

	msg, ok := r.Value.(string)
	if !ok {
		t.Fatalf("expected string, got %T", r.Value)
	}
	if msg != "hello, alice!" {
		t.Errorf("expected %q, got %q", "hello, alice!", msg)
	}
}

// TestPython_ArgsAvailableAsGlobals demonstrates that every key in args is
// directly accessible inside the script as a module-level variable.
func TestPython_ArgsAvailableAsGlobals(t *testing.T) {
	script := `return x + y`
	r, err := interp.RunPython(script, map[string]any{"x": 3, "y": 4})
	if err != nil {
		t.Fatalf("RunPython error: %v", err)
	}

	n, ok := r.Value.(int64)
	if !ok {
		t.Fatalf("expected int64, got %T (%v)", r.Value, r.Value)
	}
	if n != 7 {
		t.Errorf("expected 7, got %d", n)
	}
}

// TestPython_GuardrailPattern mirrors the real-world guardrail use case: a
// script that validates an input dict and returns pass/fail.
func TestPython_GuardrailPattern(t *testing.T) {
	script := `
def validate(inp):
    if not inp.get("topic"):
        return False
    if len(inp["topic"]) < 3:
        return False
    return inp.get("priority") in ("low", "medium", "high")

return validate(input)
`
	tests := []struct {
		name  string
		input map[string]any
		want  bool
	}{
		{"valid input", map[string]any{"topic": "billing", "priority": "high"}, true},
		{"missing topic", map[string]any{"priority": "high"}, false},
		{"bad priority", map[string]any{"topic": "billing", "priority": "urgent"}, false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			r, err := interp.RunPython(script, map[string]any{"input": tc.input})
			if err != nil {
				t.Fatalf("RunPython error: %v", err)
			}
			got, ok := r.Value.(bool)
			if !ok {
				t.Fatalf("expected bool, got %T", r.Value)
			}
			if got != tc.want {
				t.Errorf("input %v: expected %v, got %v", tc.input, tc.want, got)
			}
		})
	}
}

// TestPython_SyntaxError verifies that malformed Python is rejected cleanly.
func TestPython_SyntaxError(t *testing.T) {
	_, err := interp.RunPython("def broken(: pass", nil)
	if err == nil {
		t.Fatal("expected a syntax error, got nil")
	}
}

// TestJS_SyntaxError verifies that malformed JavaScript is rejected cleanly.
func TestJS_SyntaxError(t *testing.T) {
	_, err := interp.RunJS("function broken(} {}", nil)
	if err == nil {
		t.Fatal("expected a syntax error, got nil")
	}
}
