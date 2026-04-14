import { useCallback, useEffect, useRef, useState } from "react"
import {
  Box, Button, Card, CardContent, Checkbox, Chip, FormControlLabel,
  Grid, MenuItem, Stack, TextField, Typography,
} from "@mui/material"
import { getJSON } from "../lib/api"
import { fetchFormattedSearchResults } from "../lib/search"
import type { Workflow, VersionedItem } from "../lib/types"

type Props = { apiBaseURL: string }
type RunResult = { llmOutput: string; error: string | null }

export function WorkflowsPage({ apiBaseURL }: Props) {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [inputs, setInputs] = useState<VersionedItem[]>([])
  const [outputs, setOutputs] = useState<VersionedItem[]>([])
  const [templates, setTemplates] = useState<VersionedItem[]>([])
  const [query, setQuery] = useState("")
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [runLoading, setRunLoading] = useState(false)
  const [promptTemplateId, setPromptTemplateId] = useState("")
  const [inputGuardrailIds, setInputGuardrailIds] = useState<string[]>([])
  const [outputGuardrailIds, setOutputGuardrailIds] = useState<string[]>([])
  const nameRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setRunResult(null) }, [query, activeId])

  const loadAll = useCallback(async () => {
    const [wfData, inputsData, outputsData, templatesData] = await Promise.all([
      getJSON<{ items: Workflow[] }>(`${apiBaseURL}/api/workflows`),
      getJSON<{ items: VersionedItem[] }>(`${apiBaseURL}/api/input-guardrails`),
      getJSON<{ items: VersionedItem[] }>(`${apiBaseURL}/api/output-guardrails`),
      getJSON<{ items: VersionedItem[] }>(`${apiBaseURL}/api/templates`),
    ])
    const wfList = wfData.items ?? []
    setWorkflows(wfList)
    setActiveId((prev) => prev ?? (wfList.length > 0 ? wfList[0].id : null))
    setInputs(inputsData.items ?? [])
    setOutputs(outputsData.items ?? [])
    setTemplates(templatesData.items ?? [])
  }, [apiBaseURL])

  useEffect(() => { loadAll() }, [loadAll])

  const active = workflows.find((w) => w.id === activeId) ?? workflows[0] ?? null

  useEffect(() => {
    setPromptTemplateId(active?.promptTemplateId ?? "")
    setInputGuardrailIds(active?.inputGuardrailIds ?? [])
    setOutputGuardrailIds(active?.outputGuardrailIds ?? [])
  }, [active?.id])

  function toggleGuardrail(kind: "input" | "output", id: string) {
    const setter = kind === "input" ? setInputGuardrailIds : setOutputGuardrailIds
    setter((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  async function onNew() {
    const created = await getJSON<Workflow>(`${apiBaseURL}/api/workflows`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Untitled workflow", description: "" }),
    })
    setWorkflows((prev) => [created, ...prev])
    setActiveId(created.id)
  }

  async function onSave() {
    if (!active) return
    const updated = await getJSON<Workflow>(`${apiBaseURL}/api/workflows/${active.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nameRef.current?.value ?? active.name,
        description: descRef.current?.value ?? active.description,
        promptTemplateId,
        inputGuardrailIds,
        outputGuardrailIds,
      }),
    })
    setWorkflows((prev) => prev.map((w) => (w.id === active.id ? updated : w)))
  }

  async function onDelete() {
    if (!active || !window.confirm(`Delete "${active.name}"?`)) return
    await getJSON(`${apiBaseURL}/api/workflows/${active.id}`, { method: "DELETE" })
    setWorkflows((prev) => {
      const next = prev.filter((w) => w.id !== active.id)
      setActiveId(next.length > 0 ? next[0].id : null)
      return next
    })
  }

  async function onRun() {
    if (!active) return
    setRunLoading(true); setRunResult(null)
    try {
      const resolvedQuery = await fetchFormattedSearchResults(apiBaseURL, query)
      const resp = await getJSON<{ llmOutput?: string; echo?: string }>(
        `${apiBaseURL}/ai/v1/workflow/${active.id}`,
        { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawQuery: query, query: resolvedQuery, text: query }) }
      )
      setRunResult({ llmOutput: resp.llmOutput ?? resp.echo ?? "", error: null })
    } catch (err) {
      setRunResult({ llmOutput: "", error: String(err) })
    } finally { setRunLoading(false) }
  }

  const url = active?.id ? `${apiBaseURL}/ai/v1/workflow/${active.id}` : `${apiBaseURL}/ai/v1/workflow/{id}`

  return (
    <Grid container spacing={2} sx={{ alignItems: "flex-start" }}>
      <Grid size={{ xs: 12, md: 3 }}>
        <Card sx={{ maxHeight: "calc(100vh - 160px)", overflow: "auto" }}>
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Workflows</Typography>
              <Button size="small" variant="contained" onClick={onNew}>New</Button>
            </Stack>
            <Stack spacing={1}>
              {workflows.map((w) => (
                <Card key={w.id} variant="outlined" onClick={() => setActiveId(w.id)} sx={{
                  cursor: "pointer",
                  borderColor: active?.id === w.id ? "primary.main" : "divider",
                  bgcolor: active?.id === w.id ? "action.selected" : undefined,
                }}>
                  <CardContent sx={{ py: 1, "&:last-child": { pb: 1 } }}>
                    <Typography variant="subtitle2">{w.name}</Typography>
                    {w.description && <Typography variant="caption" color="text.secondary">{w.description}</Typography>}
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontFamily: "monospace", fontSize: "0.7rem" }}>{w.id}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 9 }}>
        <Card>
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Workflow editor</Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="contained" onClick={onSave}>Save</Button>
                <Button size="small" variant="outlined" color="error" onClick={onDelete}>Delete</Button>
              </Stack>
            </Stack>

            <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary", display: "block", mb: 2 }}>{url}</Typography>

            <Stack spacing={2}>
              <TextField label="Workflow ID" value={active?.id || ""} size="small" fullWidth slotProps={{ input: { readOnly: true } }} key={`id-${active?.id}`} />
              <TextField label="Name" inputRef={nameRef} defaultValue={active?.name || ""} size="small" fullWidth key={`name-${active?.id}`} />
              <TextField label="Description" inputRef={descRef} defaultValue={active?.description || ""} size="small" fullWidth key={`desc-${active?.id}`} />

              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Input guardrails</Typography>
                <Box sx={{ maxHeight: 180, overflowY: "auto", border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1 }}>
                  {inputs.map((g) => (
                    <FormControlLabel
                      key={g.id}
                      control={<Checkbox checked={inputGuardrailIds.includes(g.id)} onChange={() => toggleGuardrail("input", g.id)} size="small" />}
                      label={<Box><Typography variant="body2">{g.name}</Typography>{g.description && <Typography variant="caption" color="text.secondary">{g.description}</Typography>}{g.type && <Chip label={g.type} size="small" variant="outlined" sx={{ ml: 0.5, fontSize: "0.7rem" }} />}</Box>}
                      sx={{ display: "flex", alignItems: "flex-start", mb: 0.5 }}
                    />
                  ))}
                </Box>
              </Box>

              <TextField select label="Prompt template" value={promptTemplateId} onChange={(event) => setPromptTemplateId(event.target.value)} size="small" fullWidth>
                <MenuItem value="">Select a prompt template</MenuItem>
                {templates.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
              </TextField>

              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Output guardrails</Typography>
                <Box sx={{ maxHeight: 180, overflowY: "auto", border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1 }}>
                  {outputs.map((g) => (
                    <FormControlLabel
                      key={g.id}
                      control={<Checkbox checked={outputGuardrailIds.includes(g.id)} onChange={() => toggleGuardrail("output", g.id)} size="small" />}
                      label={<Box><Typography variant="body2">{g.name}</Typography>{g.description && <Typography variant="caption" color="text.secondary">{g.description}</Typography>}{g.type && <Chip label={g.type} size="small" variant="outlined" sx={{ ml: 0.5, fontSize: "0.7rem" }} />}</Box>}
                      sx={{ display: "flex", alignItems: "flex-start", mb: 0.5 }}
                    />
                  ))}
                </Box>
              </Box>

              <TextField label="Query" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Enter query - replaces {{query}} in the prompt template" size="small" fullWidth />
              <Button variant="contained" onClick={onRun} disabled={runLoading || !active} sx={{ alignSelf: "flex-start" }}>
                {runLoading ? "Running..." : "Run"}
              </Button>
              {runResult !== null && (
                <TextField label="Output" multiline rows={8} fullWidth value={runResult.error ? `Error: ${runResult.error}` : runResult.llmOutput} placeholder="(no output)" size="small" color={runResult.error ? "warning" : "success"} focused slotProps={{ input: { readOnly: true, style: { fontFamily: "monospace" } } }} />
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
