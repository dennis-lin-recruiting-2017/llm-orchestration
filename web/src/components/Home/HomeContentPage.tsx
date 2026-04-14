import type { ReactNode } from "react"
import { Box, Card, CardContent, Grid, Typography } from "@mui/material"

type HomeCard = { title: string; body: ReactNode }
type HomeCardSection = { title: string; cards: HomeCard[] }

export function HomeContentPage({
  eyebrow,
  title,
  children,
  cards = [],
  sections,
}: {
  eyebrow: string
  title: string
  children: ReactNode
  cards?: HomeCard[]
  sections?: HomeCardSection[]
}) {
  const visibleSections = sections ?? (cards.length > 0 ? [{ title: "", cards }] : [])

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="overline" color="primary">{eyebrow}</Typography>
        <Typography variant="h4" sx={{ fontWeight: 700 }} gutterBottom>{title}</Typography>
        <Box sx={{ color: "text.secondary", maxWidth: 860 }}>{children}</Box>
      </Box>
      {visibleSections.map((section) => (
        <Box key={section.title || "cards"} sx={{ mb: 4 }}>
          {section.title && <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>{section.title}</Typography>}
          <Grid container spacing={2}>
            {section.cards.map((item) => (
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
      ))}
    </Box>
  )
}
