#!/usr/bin/env bash
# Test scenarios for wf-content-analysis-002 (Content Analysis)
#
# Guardrails:
#   INPUT  igr-2  JS      – blocks empty text or text > 5000 characters
#   INPUT  igr-3  Python  – blocks text with 0 words or > 500 words
#   OUTPUT ogr-1  LLM     – blocks unhelpful, evasive, or off-topic responses
#   OUTPUT ogr-4  Python  – blocks output shorter than 20 chars or fewer than 5 words

API="${API_BASE_URL:-http://localhost:8081}"
WF="wf-content-analysis-002"
URL="$API/ai/v1/workflow/$WF"

sep() { echo; echo "──────────────────────────────────────────────────"; echo "$1"; echo "──────────────────────────────────────────────────"; }
run() { echo "$2" | python3 -m json.tool 2>/dev/null || echo "$2"; }

# ── 1. SUCCESS ────────────────────────────────────────────────────────────────
sep "[1] SUCCESS – positive product review"
result=$(curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I absolutely love this product. It exceeded all my expectations and the customer support was fantastic. Would definitely recommend to anyone looking for a reliable solution."
  }')
run "1" "$result"

# ── 2. SUCCESS ────────────────────────────────────────────────────────────────
sep "[2] SUCCESS – negative feedback with mixed intent"
result=$(curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The onboarding was confusing and took way too long. Once I got past that the core features are decent, but I expected much more for the price. Support tickets go unanswered for days."
  }')
run "2" "$result"

# ── 3. SUCCESS ────────────────────────────────────────────────────────────────
sep "[3] SUCCESS – neutral informational statement"
result=$(curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The system processed 4200 requests yesterday with an average latency of 340 milliseconds. No errors were logged during the evening maintenance window."
  }')
run "3" "$result"

# ── 4. BLOCKED – igr-2 (JS: empty text) ──────────────────────────────────────
sep "[4] BLOCKED by igr-2 – empty text field"
result=$(curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "text": ""
  }')
run "4" "$result"

# ── 5. BLOCKED – igr-2 (JS: whitespace only) ─────────────────────────────────
sep "[5] BLOCKED by igr-2 – whitespace-only text"
result=$(curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "     "
  }')
run "5" "$result"

# ── 6. BLOCKED – igr-2 (JS: text over 5000 characters) ──────────────────────
sep "[6] BLOCKED by igr-2 – text exceeds 5000 character limit"
# Generate ~5100 chars of filler text
LONG_TEXT=$(python3 -c "print('This is a filler sentence to create an oversized input. ' * 100)")
result=$(curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"$LONG_TEXT\"}")
run "6" "$result"

# ── 7. BLOCKED – igr-3 (Python: too many words > 500) ────────────────────────
sep "[7] BLOCKED by igr-3 – input word count exceeds 500 words"
# Generate a 510-word input
LONG_TEXT=$(python3 -c "print(' '.join(['word'] * 510))")
result=$(curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"$LONG_TEXT\"}")
run "7" "$result"

# ── 8. BLOCKED – ogr-4 (Python: LLM returns near-empty output) ───────────────
sep "[8] LIKELY BLOCKED by ogr-4 – input designed to elicit a minimal/empty LLM response"
result=$(curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "."
  }')
run "8" "$result"

echo
echo "Done. Check 'debug.inputGuardrails' and 'debug.outputGuardrails' in each response."
