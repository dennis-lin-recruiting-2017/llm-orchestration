import { useCallback, useEffect, useState, type ReactNode } from "react"
import {
  Box, Button, Card, CardContent, Chip, CircularProgress, Grid, Stack,
  TextField, Tooltip, Typography,
} from "@mui/material"
import { getJSON } from "../lib/api"
import type { Document } from "../lib/types"

type SearchType = "vector" | "keyword"

type Props = {
  cfg: { webBaseURL: string; apiBaseURL: string }
  query: string
  mode: string
  loading: boolean
  results: Document[]
  onQueryChange: (value: string) => void
  onSearch: (type: SearchType) => void
  onChip: (value: string, type: SearchType) => void
}

const chips = ["routing", "agents", "memory", "retrieval", "evaluation", "orchestration"]

function HelpedField({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Tooltip title={title} arrow placement="top-start">
      <Box>{children}</Box>
    </Tooltip>
  )
}

function DocCard({ doc, match }: { doc: Document; match?: Document }) {
  return (
    <Card
      variant="outlined"
      sx={{ mb: 1, borderColor: match ? "success.main" : "divider", bgcolor: match ? "action.selected" : undefined }}
    >
      <CardContent sx={{ py: 1, "&:last-child": { pb: 1 } }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
          <Typography variant="subtitle2" sx={{ flex: 1 }}>{doc.title}</Typography>
          <Chip label={doc.category} size="small" variant="outlined" />
        </Stack>
        <Typography variant="body2" color="text.secondary">{doc.body}</Typography>
        {match && typeof match.distance === "number" && (
          <Typography variant="caption" color="text.secondary">distance: {match.distance.toFixed(4)}</Typography>
        )}
      </CardContent>
    </Card>
  )
}

export function WorkspacePage(props: Props) {
  const [allDocs, setAllDocs] = useState<Document[]>([])
  const [searchType, setSearchType] = useState<SearchType>("vector")

  const loadDocs = useCallback(async () => {
    try {
      const data = await getJSON<{ documents: Document[] }>(`${props.cfg.apiBaseURL}/api/documents`)
      setAllDocs(data.documents ?? [])
    } catch { /* keep empty */ }
  }, [props.cfg.apiBaseURL])

  useEffect(() => { loadDocs() }, [loadDocs])

  const hasResults = props.results.length > 0
  const reversedResults = [...props.results].reverse()
  const searchedIds = new Set(props.results.map((d) => d.id))
  const sortedDocs = hasResults
    ? [
        ...reversedResults.map((r) => allDocs.find((d) => d.id === r.id)).filter((d): d is Document => !!d),
        ...allDocs.filter((d) => !searchedIds.has(d.id)),
      ]
    : allDocs

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="overline" color="primary">Retrieval-augmented generation</Typography>
        <Typography variant="h4" sx={{ fontWeight: 700 }} gutterBottom>RAG</Typography>
        <Typography color="text.secondary">
          Web UI on {props.cfg.webBaseURL} and API on {props.cfg.apiBaseURL}.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>Semantic search</Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1 }}>
                <HelpedField title="Enter the text to search the document corpus. Press Enter or use Vector or Keyword to run the selected search.">
                  <TextField
                    fullWidth
                    size="small"
                    value={props.query}
                    onChange={(e) => props.onQueryChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && props.onSearch(searchType)}
                    placeholder="Search"
                  />
                </HelpedField>
                <Tooltip title="Run semantic search. This ranks articles by embedding similarity when embeddings are available." arrow>
                  <Button variant="contained" onClick={() => { setSearchType("vector"); props.onSearch("vector") }}>Vector</Button>
                </Tooltip>
                <Tooltip title="Run keyword search. This is useful for exact terms, categories, and searches without vector embeddings." arrow>
                  <Button variant="outlined" onClick={() => { setSearchType("keyword"); props.onSearch("keyword") }}>Keyword</Button>
                </Tooltip>
              </Stack>

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
                {chips.map((chip) => (
                  <Tooltip key={chip} title={`Search for ${chip} using the current search mode.`} arrow>
                    <Chip label={chip} clickable size="small" variant="outlined" color="primary" onClick={() => props.onChip(chip, searchType)} />
                  </Tooltip>
                ))}
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                Mode: {props.mode || "-"}
              </Typography>

              {props.loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress size={24} /></Box>
              ) : hasResults ? (
                reversedResults.map((d) => <DocCard key={d.id} doc={d} match={d} />)
              ) : props.mode === "vector-no-embedding" ? (
                <Typography variant="body2" color="text.secondary">
                  No vector embedding available. Try a keyword chip or switch to keyword search.
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">No results. Try a chip or freeform query.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>
                All articles ({allDocs.length})
              </Typography>
              <Box sx={{ maxHeight: 600, overflowY: "auto", pr: 0.5 }}>
                {sortedDocs.map((d) => {
                  const match = props.results.find((r) => r.id === d.id)
                  return <DocCard key={d.id} doc={d} match={match} />
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
