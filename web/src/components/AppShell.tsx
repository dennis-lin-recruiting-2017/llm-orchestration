import type { ReactNode } from "react"
import type { AppRoute } from "../lib/types"

type Props = {
  route: AppRoute
  onNavigate: (path: AppRoute) => void
  topNav: ReactNode
  children: ReactNode
}

export function AppShell({ topNav, children }: Props) {
  return (
    <div className="page">
      {topNav}
      {children}
    </div>
  )
}
