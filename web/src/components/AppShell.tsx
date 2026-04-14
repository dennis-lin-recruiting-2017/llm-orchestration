import type { ReactNode } from "react"
import { Container } from "@mui/material"
import type { AppRoute } from "../lib/types"

type Props = {
  route: AppRoute
  onNavigate: (path: AppRoute) => void
  topNav: ReactNode
  children: ReactNode
}

export function AppShell({ topNav, children }: Props) {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {topNav}
      {children}
    </Container>
  )
}
