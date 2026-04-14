import type { ReactNode } from "react"
import { Box, Card, CardContent, Grid, Typography } from "@mui/material"

export function HomeContentPage({
  eyebrow,
  title,
  children,
  cards,
}: {
  eyebrow: string
  title: string
  children: ReactNode
  cards: Array<{ title: string; body: ReactNode }>
}) {
  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="overline" color="primary">{eyebrow}</Typography>
        <Typography variant="h4" sx={{ fontWeight: 700 }} gutterBottom>{title}</Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 680 }}>{children}</Typography>
      </Box>
      <Grid container spacing={2}>
        {cards.map((item) => (
          <Grid key={item.title} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>{item.title}</Typography>
                <Typography color="text.secondary" variant="body2">{item.body}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
