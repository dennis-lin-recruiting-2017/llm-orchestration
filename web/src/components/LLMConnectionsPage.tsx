import { type ReactNode } from "react"
import { Box, Button, Card, CardContent, Grid, MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material"
import type { LLMConnections } from "../lib/types"

function HelpedField({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Tooltip title={title} arrow placement="top-start">
      <Box>{children}</Box>
    </Tooltip>
  )
}

export function LLMConnectionsPage({ connections }: { connections: LLMConnections }) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Card>
          <CardContent>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>LLM connections</Typography>
              <Tooltip title="Save these provider settings for workflow inference." arrow>
                <Button variant="contained" size="small">Save</Button>
              </Tooltip>
            </Stack>

            <Stack spacing={2}>
              <HelpedField title="Choose which local LLM provider workflows should use.">
                <TextField select label="Provider" defaultValue={connections.provider} size="small" fullWidth>
                  <MenuItem value="LMStudio">LM Studio</MenuItem>
                  <MenuItem value="Ollama">Ollama</MenuItem>
                </TextField>
              </HelpedField>

              <Typography variant="subtitle2" color="text.secondary">LM Studio</Typography>
              <HelpedField title="Base URL for LM Studio's OpenAI-compatible server, such as http://127.0.0.1:1234.">
                <TextField label="Base URL" defaultValue={connections.lmstudio.baseURL} size="small" fullWidth />
              </HelpedField>
              <HelpedField title="Model name to request from LM Studio when workflows call the LLM.">
                <TextField label="Model" defaultValue={connections.lmstudio.model} size="small" fullWidth />
              </HelpedField>

              <Typography variant="subtitle2" color="text.secondary">Ollama</Typography>
              <HelpedField title="Base URL for the Ollama server, such as http://127.0.0.1:11434.">
                <TextField label="Base URL" defaultValue={connections.ollama.baseURL} size="small" fullWidth />
              </HelpedField>
              <HelpedField title="Ollama model name to request when workflows call the LLM.">
                <TextField label="Model" defaultValue={connections.ollama.model} size="small" fullWidth />
              </HelpedField>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 5 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>Notes</Typography>
            <Typography color="text.secondary">
              Use this page to point the app at a local LM Studio or Ollama server.
              Settings are stored in the user cache directory.
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
