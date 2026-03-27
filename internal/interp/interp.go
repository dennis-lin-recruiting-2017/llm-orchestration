// Package interp provides pure-Go JavaScript and Python interpreters backed by
// goja (ECMAScript 5.1) and gpython respectively.  Both engines run entirely
// in-process with no CGO or external process.
package interp

import (
	"fmt"
	"strings"

	"github.com/dop251/goja"
	gpycompile "github.com/go-python/gpython/compile"
	"github.com/go-python/gpython/py"
	_ "github.com/go-python/gpython/stdlib"
)

// Result is the value returned by a script execution.  Value holds a
// Go-native type (bool, int64, float64, string, or nil); Raw holds the
// human-readable string form of that value.
type Result struct {
	Value any
	Raw   string
}

// ──────────────────────────────────────────────
// JavaScript  (goja — pure-Go ECMAScript 5.1)
// ──────────────────────────────────────────────

// RunJS executes script as the body of a self-invoking JavaScript function.
//
// Every key in args is set as a global variable in the VM before execution, so
// scripts can reference them directly.  The script's explicit return value (or
// the last evaluated expression if there is no return) becomes Result.Value.
//
// Example — call a function and receive a bool in Go:
//
//	r, err := interp.RunJS(`
//	    function greet(name) { return "hello, " + name; }
//	    return greet(username);
//	`, map[string]any{"username": "alice"})
//	// r.Value is "hello, alice"  (string)
//	msg := r.Value.(string)
func RunJS(script string, args map[string]any) (Result, error) {
	vm := goja.New()
	for k, v := range args {
		vm.Set(k, v)
	}
	// Wrap in a self-invoking function so that `return` is valid anywhere in
	// the body and the result flows back to Go naturally.
	src := fmt.Sprintf("(function(){\n%s\n})()", script)
	val, err := vm.RunString(src)
	if err != nil {
		return Result{}, err
	}
	return jsResultOf(val), nil
}

// ──────────────────────────────────────────────
// Python  (gpython — pure-Go CPython-compatible)
// ──────────────────────────────────────────────

// RunPython executes a Python script in a fresh gpython interpreter.
//
// The script is wrapped in a function __fn__ so that top-level `return`
// statements are valid.  Every key in args is injected as a module-level
// variable before execution.  The value returned by the function (or
// explicitly assigned to "result" at module scope) is captured and returned
// as Result.Value.
//
// Example — call a function and receive a string in Go:
//
//	r, err := interp.RunPython(`
//	    def greet(name):
//	        return "hello, " + name
//	    return greet(username)
//	`, map[string]any{"username": "alice"})
//	// r.Value is "hello, alice"  (string)
//	msg := r.Value.(string)
func RunPython(script string, args map[string]any) (Result, error) {
	src := wrapPython(script)

	codeObj, err := gpycompile.Compile(src, "<script>", py.ExecMode, 0, true)
	if err != nil {
		return Result{}, err
	}

	globals := py.NewStringDict()
	for k, v := range args {
		globals[k] = pyOf(v)
	}

	ctx := py.NewContext(py.ContextOpts{})
	defer ctx.Close()

	if _, err = ctx.RunCode(codeObj, globals, globals, nil); err != nil {
		return Result{}, err
	}

	raw, ok := globals["result"]
	if !ok {
		return Result{Value: nil, Raw: "None"}, nil
	}
	return pyResultOf(raw), nil
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

// wrapPython moves the user's script into a function body so that top-level
// `return` statements compile without error, then calls the function and
// assigns the return value to the module-level name "result".
func wrapPython(body string) string {
	var b strings.Builder
	b.WriteString("def __fn__():\n")
	for _, line := range strings.Split(body, "\n") {
		if strings.TrimSpace(line) == "" {
			b.WriteString("    pass\n")
		} else {
			b.WriteString("    " + line + "\n")
		}
	}
	b.WriteString("result = __fn__()\n")
	return b.String()
}

// pyOf converts a Go value to the closest gpython object.
func pyOf(v any) py.Object {
	switch t := v.(type) {
	case bool:
		if t {
			return py.True
		}
		return py.False
	case int:
		return py.Int(t)
	case int64:
		return py.Int(t)
	case float64:
		return py.Float(t)
	case string:
		return py.String(t)
	case map[string]any:
		// Convert Go map to a Python dict so scripts can call .get(), iterate, etc.
		d := py.NewStringDict()
		for k, val := range t {
			d[k] = pyOf(val)
		}
		return d
	default:
		return py.None
	}
}

// pyResultOf converts a gpython object to a Result with a Go-native Value.
func pyResultOf(v py.Object) Result {
	switch t := v.(type) {
	case py.Bool:
		b := t == py.True
		return Result{Value: b, Raw: fmt.Sprintf("%v", b)}
	case py.Int:
		n := int64(t)
		return Result{Value: n, Raw: fmt.Sprintf("%d", n)}
	case py.Float:
		f := float64(t)
		return Result{Value: f, Raw: fmt.Sprintf("%g", f)}
	case py.String:
		s := string(t)
		return Result{Value: s, Raw: s}
	default:
		if v == py.None {
			return Result{Value: nil, Raw: "None"}
		}
		return Result{Value: nil, Raw: v.Type().Name}
	}
}

// jsResultOf converts a goja Value to a Result with a Go-native Value.
func jsResultOf(val goja.Value) Result {
	if val == nil || goja.IsNull(val) || goja.IsUndefined(val) {
		return Result{Value: nil, Raw: "undefined"}
	}
	switch v := val.Export().(type) {
	case bool:
		return Result{Value: v, Raw: fmt.Sprintf("%v", v)}
	case int64:
		return Result{Value: v, Raw: fmt.Sprintf("%d", v)}
	case float64:
		return Result{Value: v, Raw: fmt.Sprintf("%g", v)}
	case string:
		return Result{Value: v, Raw: v}
	default:
		return Result{Value: v, Raw: val.String()}
	}
}
