import { Button, Card, CardContent, Grid, MenuItem, Stack, TextField, Typography } from "@mui/material"
import type { LLMConnections } from "../lib/types"

export function LLMConnectionsPage({ connections }: { connections: LLMConnections }) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Card>
          <CardContent>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>LLM connections</Typography>
              <Button variant="contained" size="small">Save</Button>
            </Stack>

            <Stack spacing={2}>
              <TextField select label="Provider" defaultValue={connections.provider} size="small" fullWidth>
                <MenuItem value="LMStudio">LM Studio</MenuItem>
                <MenuItem value="Ollama">Ollama</MenuItem>
              </TextField>

              <Typography variant="subtitle2" color="text.secondary">LM Studio</Typography>
              <TextField label="Base URL" defaultValue={connections.lmstudio.baseURL} size="small" fullWidth />
              <TextField label="Model" defaultValue={connections.lmstudio.model} size="small" fullWidth />

              <Typography variant="subtitle2" color="text.secondary">Ollama</Typography>
              <TextField label="Base URL" defaultValue={connections.ollama.baseURL} size="small" fullWidth />
              <TextField label="Model" defaultValue={connections.ollama.model} size="small" fullWidth />
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
