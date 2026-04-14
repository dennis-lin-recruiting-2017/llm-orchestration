import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Box, Button, Card, CardContent, Chip, Grid,
  MenuItem, Stack, TextField, Typography,
} from "@mui/material"
import { getJSON } from "../lib/api"
import { fetchFormattedSearchResults } from "../lib/search"
import type { VersionedItem } from "../lib/types"

type Props = { apiBaseURL: string; apiPath: string; title: string; typed: boolean }
type RunResult = { passed: boolean; engine: string; detail: string; error: string | null }
type TemplateResult = { output: string; error: string | null }

export function VersionedEditorPage({ apiBaseURL, apiPath, title, typed }: Props) {
  const [items, setItems] = useState<VersionedItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState("LLM")
  const [testInput, setTestInput] = useState("")
  const [query, setQuery] = useState("")
  const [queryResults, setQueryResults] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [templateResult, setTemplateResult] = useState<TemplateResult | null>(null)
  const [codeContent, setCodeContent] = useState("")
  const [runLoading, setRunLoading] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLInputElement>(null)

  void queryResults

  const loadItems = useCallback(async () => {
    const data = await getJSON<{ items: VersionedItem[] }>(`${apiBaseURL}${apiPath}`)
    const list = data.items ?? []
    setItems(list)
    setActiveId((prev) => prev ?? (list.length > 0 ? list[0].id : null))
  }, [apiBaseURL, apiPath])

  useEffect(() => { loadItems() }, [loadItems])

  const active = items.find((i) => i.id === activeId) ?? items[0] ?? null
  const latest = ((active?.versions || []).find((v) => v.version === active?.currentVersion) || {}).content || ""

  useEffect(() => {
    setSelectedType(active?.type || "LLM")
    setCodeContent(latest)
    setRunResult(null)
    setTemplateResult(null)
    setQueryResults(null)
    setTestInput(active?.id ? (localStorage.getItem(`${apiPath}:${active.id}:testInput`) ?? "") : "")
    setQuery(active?.id ? (localStorage.getItem(`${apiPath}:${active.id}:query`) ?? "") : "")
  }, [active?.id, latest, apiPath])

  useEffect(() => { setQueryResults(null) }, [query])
  useEffect(() => { if (activeId) localStorage.setItem(`${apiPath}:${activeId}:testInput`, testInput) }, [apiPath, activeId, testInput])
  useEffect(() => { if (activeId) localStorage.setItem(`${apiPath}:${activeId}:query`, query) }, [apiPath, activeId, query])

  const types = ["LLM", "Regex", "CustomJavaScript", "CustomPython"]

  async function onNew() {
    const created = await getJSON<VersionedItem>(`${apiBaseURL}${apiPath}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: selectedType, name: "Untitled", description: "", content: "" }),
    })
    setItems((prev) => [created, ...prev])
    setActiveId(created.id)
  }

  async function onSave() {
    if (!active) return
    const updated = await getJSON<VersionedItem>(`${apiBaseURL}${apiPath}/${active.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: selectedType,
        name: nameRef.current?.value ?? active.name,
        description: descRef.current?.value ?? active.description,
        content: codeContent,
      }),
    })
    setItems((prev) => prev.map((i) => (i.id === active.id ? updated : i)))
  }

  async function onDelete() {
    if (!active || !window.confirm(`Delete "${active.name}"?`)) return
    await getJSON(`${apiBaseURL}${apiPath}/${active.id}`, { method: "DELETE" })
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== active.id)
      setActiveId(next.length > 0 ? next[0].id : null)
      return next
    })
  }

  async function onActivateVersion(itemId: string, version: number) {
    if (!window.confirm(`Set v${version} as the active version?`)) return
    const updated = await getJSON<VersionedItem>(`${apiBaseURL}${apiPath}/${itemId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restoreVersion: version }),
    })
    setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)))
  }

  async function onRunCode() {
    setRunLoading(true); setRunResult(null); setTemplateResult(null)
    try {
      if (!typed) {
        const resolvedQuery = await fetchFormattedSearchResults(apiBaseURL, query)
        setQueryResults(resolvedQuery)
        const result = await getJSON<TemplateResult>(`${apiBaseURL}/api/run-template`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: codeContent, text: testInput, query: resolvedQuery }),
        })
        setTemplateResult(result)
      } else {
        const result = await getJSON<RunResult>(`${apiBaseURL}/api/run-guardrail`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: selectedType, code: codeContent, text: testInput }),
        })
        setRunResult(result)
      }
    } catch (err) {
      if (!typed) setTemplateResult({ output: "", error: String(err) })
      else setRunResult({ passed: false, engine: "", detail: "", error: String(err) })
    } finally { setRunLoading(false) }
  }

  function contentLabel() {
    switch (selectedType) {
      case "CustomJavaScript": return "JavaScript Script"
      case "CustomPython": return "Python Script"
      case "Regex": return "Regex Pattern"
      case "LLM": return "Rubric Prompt"
      default: return "Content"
    }
  }

  function contentHint() {
    switch (selectedType) {
      case "CustomJavaScript": return "input.text"
      case "CustomPython": return `input["text"]`
      case "Regex": return "output"
      case "LLM": return "{{text}}"
      default: return null
    }
  }

  const finalPrompt = useMemo(() => {
    if (typed) return null
    return codeContent.replaceAll("{{query}}", "<<query results>>").replaceAll("{{text}}", testInput)
  }, [typed, codeContent, testInput])

  const runResultColor = runResult?.error ? "warning" : runResult?.passed ? "success" : "error"

  return (
    <Grid container spacing={2} sx={{ alignItems: "flex-start" }}>
      <Grid size={{ xs: 12, md: 3 }}>
        <Card sx={{ maxHeight: "calc(100vh - 160px)", overflow: "auto" }}>
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
              <Button size="small" variant="contained" onClick={onNew}>New</Button>
            </Stack>
            <Stack spacing={1}>
              {items.map((i) => (
                <Card key={i.id} variant="outlined" onClick={() => setActiveId(i.id)} sx={{ cursor: "pointer", borderColor: active?.id === i.id ? "primary.main" : "divider", bgcolor: active?.id === i.id ? "action.selected" : undefined }}>
                  <CardContent sx={{ py: 1, "&:last-child": { pb: 1 } }}>
                    <Typography variant="subtitle2">{i.name}</Typography>
                    {i.description && <Typography variant="caption" color="text.secondary">{i.description}</Typography>}
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                      {i.type && <Chip label={i.type} size="small" variant="outlined" />}
                      <Chip label={`v${i.currentVersion}`} size="small" color="primary" />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Edit{active && <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>{codeContent !== latest ? "New" : `v${active.currentVersion}`}</Typography>}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="contained" onClick={onSave}>Save</Button>
                <Button size="small" variant="outlined" color="error" onClick={onDelete}>Delete</Button>
              </Stack>
            </Stack>

            <Stack spacing={2}>
              {typed && (
                <TextField select label="Type" value={selectedType} onChange={(e) => { setSelectedType(e.target.value); setRunResult(null) }} size="small" fullWidth>
                  {types.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              )}

              <TextField label="Name" inputRef={nameRef} defaultValue={active?.name || ""} key={`name-${active?.id}`} size="small" fullWidth />
              <TextField label="Description" inputRef={descRef} defaultValue={active?.description || ""} key={`desc-${active?.id}`} size="small" fullWidth />

              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{contentLabel()}</Typography>
                  {contentHint() && <Chip label={contentHint()!} size="small" variant="outlined" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }} />}
                </Box>
                <TextField key={`code-${active?.id}`} multiline rows={18} fullWidth value={codeContent} onChange={(e) => setCodeContent(e.target.value)} size="small" slotProps={{ input: { sx: { fontFamily: "ui-monospace, monospace", fontSize: "0.85rem" } } }} />
              </Box>

              {!typed && <TextField label="Query" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Enter query - replaces {{query}} in the template" size="small" fullWidth />}
              <TextField label="Test input text" value={testInput} onChange={(e) => setTestInput(e.target.value)} placeholder={typed ? "Enter text to test the guardrail against" : "Enter text - replaces {{text}} in the template"} size="small" fullWidth />
              <Button variant="contained" onClick={onRunCode} disabled={runLoading} sx={{ alignSelf: "flex-start" }}>{runLoading ? "Running..." : "Run"}</Button>

              {!typed && templateResult !== null && <TextField label="Output" multiline rows={8} fullWidth value={templateResult.error ? `Error: ${templateResult.error}` : templateResult.output} placeholder="(no output)" size="small" color={templateResult.error ? "warning" : "success"} focused slotProps={{ input: { readOnly: true, sx: { fontFamily: "monospace", fontSize: "0.85rem" } } }} />}
              {typed && runResult !== null && (
                <>
                  <TextField label="Detail" multiline rows={3} fullWidth value={runResult.error ? "" : runResult.detail} size="small" slotProps={{ input: { readOnly: true } }} />
                  <TextField label={`Result - ${runResult.error ? "Error" : runResult.passed ? "Passed" : "Failed"}`} multiline rows={3} fullWidth value={runResult.error ? `Error: ${runResult.error}` : `passed: ${runResult.passed}\nengine: ${runResult.engine}`} size="small" color={runResultColor} focused slotProps={{ input: { readOnly: true } }} />
                </>
              )}
              {finalPrompt !== null && <TextField label="Final prompt preview" multiline rows={8} fullWidth value={finalPrompt} placeholder="(type a query or input to preview)" size="small" slotProps={{ input: { readOnly: true, sx: { fontFamily: "monospace", fontSize: "0.85rem" } } }} />}
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
              Click a version in the history panel to make it active.
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 3 }}>
        <Card sx={{ maxHeight: "calc(100vh - 160px)", overflow: "auto" }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>Version history</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>Click a version card to make it active.</Typography>
            <Stack spacing={1}>
              {(active?.versions || []).slice().sort((a, b) => b.version - a.version).map((v) => (
                <Card key={v.version} variant="outlined" onClick={() => active && onActivateVersion(active.id, v.version)} sx={{ cursor: "pointer", "&:hover": { borderColor: "primary.main" } }}>
                  <CardContent sx={{ py: 1, "&:last-child": { pb: 1 } }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="subtitle2">v{v.version}</Typography>
                      {active?.currentVersion === v.version && <Chip label="Active" size="small" color="primary" />}
                    </Box>
                    <Typography variant="caption" color="text.secondary">{new Date(v.updatedAt).toLocaleString()}</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, fontFamily: "monospace", fontSize: "0.75rem", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{v.content}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
