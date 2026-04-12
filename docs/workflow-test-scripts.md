# Workflow Test Scripts

Two bash scripts exercise each default workflow across a range of scenarios: normal success, input guardrail rejection, and output guardrail rejection.

## Prerequisites

- The server must be running: `./build/llm-orchestration`
- Override the API base URL if needed: `export API_BASE_URL=http://localhost:8081`

## Running the Scripts

```bash
./scripts/test-rag-qa.sh
./scripts/test-content-analysis.sh
```

Each scenario prints the full JSON response. Check the `debug.inputGuardrails` and `debug.outputGuardrails` fields to see which guardrails passed or failed and how long each took.

---

## RAG Q&A (`wf-rag-qa-001`)

**Script:** `scripts/test-rag-qa.sh`

**Guardrail configuration:**

| Side | ID | Type | Purpose |
|------|----|------|---------|
| Input | `igr-1` | Regex | Blocks SSNs (`ddd-dd-dddd`) and email addresses |
| Input | `igr-4` | LLM | Blocks off-topic requests and prompt injection attempts |
| Output | `ogr-2` | JavaScript | Blocks output containing `sk-` patterns or exceeding 1500 words |
| Output | `ogr-3` | Regex | Blocks output that begins with a refusal phrase |

### Scenarios

| # | Expected outcome | Guardrail triggered | Description |
|---|-----------------|---------------------|-------------|
| 1 | ✅ Success | — | Normal question about intent-based routing with a `rawQuery` of `"routing"` |
| 2 | ✅ Success | — | Multi-topic freeform query combining memory and retrieval |
| 3 | ❌ Blocked (input) | `igr-1` Regex | Input contains a Social Security Number (`123-45-6789`) |
| 4 | ❌ Blocked (input) | `igr-1` Regex | Input contains an email address (`alice@example.com`) |
| 5 | ❌ Blocked (input) | `igr-4` LLM | Prompt injection — instructs the model to reveal its system prompt |
| 6 | ❌ Blocked (input) | `igr-4` LLM | Entirely off-topic request (poem and recipe) unrelated to knowledge retrieval |
| 7 | ❌ Blocked (output) | `ogr-3` Regex | Request for harmful content designed to elicit a refusal phrase from the LLM |

---

## Content Analysis (`wf-content-analysis-002`)

**Script:** `scripts/test-content-analysis.sh`

**Guardrail configuration:**

| Side | ID | Type | Purpose |
|------|----|------|---------|
| Input | `igr-2` | JavaScript | Blocks empty text or text exceeding 5000 characters |
| Input | `igr-3` | Python | Blocks input with 0 words or more than 500 words |
| Output | `ogr-1` | LLM | Blocks unhelpful, evasive, or off-topic responses |
| Output | `ogr-4` | Python | Blocks output shorter than 20 characters or fewer than 5 words |

### Scenarios

| # | Expected outcome | Guardrail triggered | Description |
|---|-----------------|---------------------|-------------|
| 1 | ✅ Success | — | Positive product review with clear sentiment |
| 2 | ✅ Success | — | Negative feedback with mixed intent |
| 3 | ✅ Success | — | Neutral operational status report |
| 4 | ❌ Blocked (input) | `igr-2` JavaScript | Empty string `""` |
| 5 | ❌ Blocked (input) | `igr-2` JavaScript | Whitespace-only string |
| 6 | ❌ Blocked (input) | `igr-2` JavaScript | Text exceeding 5000 characters (~5100 chars of repeated filler) |
| 7 | ❌ Blocked (input) | `igr-3` Python | 510-word input, exceeding the 500-word limit |
| 8 | ❌ Likely blocked (output) | `ogr-4` Python | Single period `"."` designed to produce a near-empty LLM response |

---

## Reading the Response

Every workflow response includes a `debug` object that shows the result of each guardrail:

```json
{
  "status": "accepted",
  "llmOutput": "...",
  "metadata": {
    "queryTimeMs": 0.01,
    "inferenceTimeMs": 312.5,
    "model": "local-model",
    "inferenceEndpoint": "http://127.0.0.1:1234"
  },
  "debug": {
    "ragResults": ["[1] Intent-based routing...", "..."],
    "inputGuardrails": {
      "PII redaction check": {
        "passed": true,
        "engine": "Regex",
        "detail": "",
        "durationMs": 0.04
      }
    },
    "outputGuardrails": {
      "Refusal detection": {
        "passed": false,
        "engine": "Regex",
        "detail": "match found",
        "durationMs": 0.02
      }
    }
  }
}
```

Key fields:

| Field | Description |
|-------|-------------|
| `debug.inputGuardrails.<name>.passed` | `true` if the guardrail allowed the request |
| `debug.inputGuardrails.<name>.engine` | The engine type: `Regex`, `LLM`, `CustomJavaScript`, `CustomPython` |
| `debug.inputGuardrails.<name>.detail` | Error detail or match information when a guardrail fails |
| `debug.inputGuardrails.<name>.durationMs` | Time taken to evaluate the guardrail in milliseconds |
| `metadata.queryTimeMs` | Time spent on the RAG document search |
| `metadata.inferenceTimeMs` | Time spent on the LLM inference call |
