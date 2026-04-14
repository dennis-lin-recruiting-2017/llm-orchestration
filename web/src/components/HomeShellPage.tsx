import type { ReactNode } from "react"
import { Box } from "@mui/material"
import type { AppRoute } from "../lib/types"
import { DrawerNav } from "./DrawerNav"

export function HomeShellPage({
  route,
  onNavigate,
  children,
}: {
  route: AppRoute
  onNavigate: (path: AppRoute) => void
  children: ReactNode
}) {
  return (
    <Box sx={{ display: "flex", gap: 2 }}>
      <DrawerNav route={route} onNavigate={onNavigate} />
      {children}
    </Box>
  )
}
