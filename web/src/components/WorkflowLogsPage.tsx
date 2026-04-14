import { useState } from "react"
import {
  Accordion, AccordionDetails, AccordionSummary,
  Box, Button, ButtonBase, Card, CardContent, Chip, Grid, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import type { WorkflowLogDetail, WorkflowLogListItem } from "../lib/types"

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue }

const jsonSx = {
  tree: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: "0.85rem", lineHeight: 1.6 },
  block: { display: "block", pl: 2.5, borderLeft: "1px solid", borderColor: "divider", my: 0.25 },
  row: { display: "block" },
  key: { color: "primary.light" },
  index: { color: "text.secondary" },
  string: { color: "success.light" },
  number: { color: "warning.light" },
  bool: { color: "secondary.light" },
  null: { color: "text.disabled", fontStyle: "italic" },
  punct: { color: "text.secondary" },
  ellipsis: { color: "text.secondary", cursor: "pointer", "&:hover": { color: "text.primary" } },
} as const

function JsonNode({ value, depth = 0 }: { value: JsonValue; depth?: number }) {
  const [open, setOpen] = useState(depth < 2)
  if (value === null) return <Box component="span" sx={jsonSx.null}>null</Box>
  if (typeof value === "boolean") return <Box component="span" sx={jsonSx.bool}>{value.toString()}</Box>
  if (typeof value === "number") return <Box component="span" sx={jsonSx.number}>{value}</Box>
  if (typeof value === "string") return <Box component="span" sx={jsonSx.string}>"{value}"</Box>
  const isArray = Array.isArray(value)
  const entries = isArray ? (value as JsonValue[]).map((v, i) => [String(i), v] as [string, JsonValue]) : Object.entries(value as { [k: string]: JsonValue })
  const brackets: [string, string] = isArray ? ["[", "]"] : ["{", "}"]
  if (entries.length === 0) return <Box component="span" sx={jsonSx.punct}>{brackets[0]}{brackets[1]}</Box>
  return (
    <Box component="span" sx={{ display: "inline" }}>
      <ButtonBase component="button" onClick={() => setOpen((o) => !o)} sx={{ px: 0.25, mr: 0.25, minWidth: 14, borderRadius: 0.5, color: "primary.main", fontFamily: "inherit", fontSize: "0.75rem", lineHeight: 1, verticalAlign: "middle" }}>
        {open ? "▾" : "▸"}
      </ButtonBase>
      <Box component="span" sx={jsonSx.punct}>{brackets[0]}</Box>
      {open ? (
        <Box component="span" sx={jsonSx.block}>
          {entries.map(([k, v], i) => (
            <Box component="span" sx={jsonSx.row} key={k}>
              {!isArray && <Box component="span" sx={jsonSx.key}>"{k}"<Box component="span" sx={jsonSx.punct}>: </Box></Box>}
              {isArray && <Box component="span" sx={jsonSx.index}>{k}<Box component="span" sx={jsonSx.punct}>: </Box></Box>}
              <JsonNode value={v} depth={depth + 1} />
              {i < entries.length - 1 && <Box component="span" sx={jsonSx.punct}>,</Box>}
            </Box>
          ))}
        </Box>
      ) : (
        <Box component="span" sx={jsonSx.ellipsis} onClick={() => setOpen(true)}> ... </Box>
      )}
      <Box component="span" sx={jsonSx.punct}>{brackets[1]}</Box>
    </Box>
  )
}

function JsonView({ raw }: { raw: string }) {
  try {
    return <Box sx={jsonSx.tree}><JsonNode value={JSON.parse(raw)} depth={0} /></Box>
  } catch {
    return <Box component="pre" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "monospace", fontSize: "0.85rem", m: 0 }}>{raw}</Box>
  }
}

function GuardrailRows({ items }: { items: WorkflowLogDetail["inputGuardrails"] }) {
  if (!items?.length) return <Typography variant="body2" color="text.secondary">No entries</Typography>
  return (
    <Stack spacing={1}>
      {items.map((g) => (
        <Card key={g.guardrailId + g.createdAt} variant="outlined" sx={{ borderColor: g.passed ? "divider" : "error.main", bgcolor: g.passed ? undefined : "rgba(255,80,80,0.06)" }}>
          <CardContent sx={{ py: 1, "&:last-child": { pb: 1 } }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="subtitle2">{g.guardrailId}</Typography>
              <Chip label={g.guardrailType} size="small" variant="outlined" />
              <Chip label={g.passed ? "Passed" : "Failed"} size="small" color={g.passed ? "success" : "error"} />
            </Stack>
            <Typography variant="caption" color="text.secondary">Engine: {g.engine} · {(g.durationMs ?? 0).toFixed(2)} ms</Typography>
            {g.detail && <Typography variant="body2" sx={{ mt: 0.5 }}>{g.detail}</Typography>}
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}

type Props = {
  logs: WorkflowLogListItem[]
  selected: WorkflowLogDetail | null
  onRefresh?: () => void
  onSelect?: (requestId: string) => void
}

function DetailAccordion({ label, children, failBadge }: { label: string; children: React.ReactNode; failBadge?: boolean }) {
  return (
    <Accordion disableGutters sx={{ mt: 1, borderColor: failBadge ? "error.main" : "divider", bgcolor: failBadge ? "rgba(255,80,80,0.04)" : undefined }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: failBadge ? "rgba(255,80,80,0.08)" : "background.paper" }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Typography sx={{ fontWeight: 700 }}>{label}</Typography>
          {failBadge && <Chip label="Failed" size="small" color="error" />}
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ bgcolor: "background.default" }}>{children}</AccordionDetails>
    </Accordion>
  )
}

export function WorkflowLogsPage({ logs, selected, onRefresh, onSelect }: Props) {
  const [templateFilter, setTemplateFilter] = useState("")
  const [versionFilter, setVersionFilter] = useState("")
  const inputFailed = selected?.inputGuardrails?.some((g) => !g.passed) ?? false
  const outputFailed = selected?.outputGuardrails?.some((g) => !g.passed) ?? false
  const normalizedTemplateFilter = templateFilter.trim().toLowerCase()
  const normalizedVersionFilter = versionFilter.trim().toLowerCase()
  const filteredLogs = logs.filter((item) => {
    const templateValue = `${item.promptTemplateName || ""} ${item.promptTemplateId || ""}`.toLowerCase()
    const versionValue = String(item.promptTemplateVersion ?? "").toLowerCase()
    return (
      (!normalizedTemplateFilter || templateValue.includes(normalizedTemplateFilter)) &&
      (!normalizedVersionFilter || versionValue.includes(normalizedVersionFilter))
    )
  })

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Card sx={{ height: "calc((100vh - 176px) / 2)", minHeight: 280, display: "flex", flexDirection: "column" }}>
          <CardContent>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Workflow logs</Typography>
              <Button size="small" variant="outlined" onClick={onRefresh}>Refresh</Button>
            </Stack>
            <TableContainer sx={{ maxHeight: "calc((100vh - 176px) / 2 - 80px)" }}>
              <Table size="small">
                <TableHead>
                  <TableRow><TableCell>Request ID</TableCell><TableCell>Timestamp</TableCell><TableCell>Template</TableCell><TableCell>v</TableCell></TableRow>
                  <TableRow>
                    <TableCell />
                    <TableCell />
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        label="Filter template"
                        value={templateFilter}
                        onChange={(event) => setTemplateFilter(event.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        label="Filter version"
                        value={versionFilter}
                        onChange={(event) => setVersionFilter(event.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredLogs.map((item) => (
                    <TableRow key={item.requestId} hover selected={selected?.requestId === item.requestId} onClick={() => onSelect?.(item.requestId)} sx={{ cursor: "pointer" }}>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{item.requestId}</TableCell>
                      <TableCell sx={{ fontSize: "0.75rem" }}>{item.requestTimestamp}</TableCell>
                      <TableCell sx={{ fontSize: "0.75rem" }}>{item.promptTemplateName || item.promptTemplateId || ""}</TableCell>
                      <TableCell sx={{ fontSize: "0.75rem" }}>{item.promptTemplateVersion}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card sx={{ height: "calc((100vh - 176px) / 2)", minHeight: 320, display: "flex", flexDirection: "column" }}>
          <CardContent sx={{ pb: 1, borderBottom: "1px solid", borderColor: "divider", flexShrink: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Log details{selected ? ` - ${selected.requestId}` : ""}
            </Typography>
          </CardContent>
          <CardContent sx={{ overflow: "auto", pt: 1 }}>
            {selected ? (
              <>
                <DetailAccordion label="Search Query"><Box component="pre" sx={{ m: 0, fontFamily: "monospace", fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>{selected.rawQuery || selected.query || "(none)"}</Box></DetailAccordion>
                <DetailAccordion label="User Prompt"><Box component="pre" sx={{ m: 0, fontFamily: "monospace", fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>{selected.text || "(none)"}</Box></DetailAccordion>
                <DetailAccordion label="Query results"><Box component="pre" sx={{ m: 0, fontFamily: "monospace", fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>{selected.query || "(none)"}</Box></DetailAccordion>
                <DetailAccordion label="Final prompt"><Box component="pre" sx={{ m: 0, fontFamily: "monospace", fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>{selected.finalPrompt || "(none)"}</Box></DetailAccordion>
                <DetailAccordion label="LLM output"><Box component="pre" sx={{ m: 0, fontFamily: "monospace", fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>{selected.llmOutput || "(none)"}</Box></DetailAccordion>
                <DetailAccordion label="Timing & inference">
                  <Table size="small"><TableBody>
                    <TableRow><TableCell>Search duration</TableCell><TableCell>{((selected.searchDurationUs ?? 0) / 1000).toFixed(2)} ms</TableCell></TableRow>
                    <TableRow><TableCell>Inference duration</TableCell><TableCell>{((selected.inferenceDurationUs ?? 0) / 1000).toFixed(2)} ms</TableCell></TableRow>
                    <TableRow><TableCell>Inference endpoint</TableCell><TableCell sx={{ fontFamily: "monospace" }}>{selected.inferenceEndpoint || "(none)"}</TableCell></TableRow>
                    <TableRow><TableCell>Model</TableCell><TableCell sx={{ fontFamily: "monospace" }}>{selected.inferenceModel || "(none)"}</TableCell></TableRow>
                  </TableBody></Table>
                </DetailAccordion>
                <DetailAccordion label="Request body"><JsonView raw={selected.requestBody} /></DetailAccordion>
                <DetailAccordion label="Input guardrails" failBadge={inputFailed}><GuardrailRows items={selected.inputGuardrails} /></DetailAccordion>
                <DetailAccordion label="Output guardrails" failBadge={outputFailed}><GuardrailRows items={selected.outputGuardrails} /></DetailAccordion>
                <DetailAccordion label="Response body"><JsonView raw={selected.responseBody} /></DetailAccordion>
              </>
            ) : (
              <Typography color="text.secondary">Select a request from the table to view details.</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
