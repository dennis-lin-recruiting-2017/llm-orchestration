import type { ReactNode } from "react"
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
    <div className="app-shell">
      <DrawerNav route={route} onNavigate={onNavigate} />
      {children}
    </div>
  )
}
