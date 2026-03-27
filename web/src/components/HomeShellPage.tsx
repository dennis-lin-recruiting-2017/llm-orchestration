import type { AppRoute } from "../lib/types"
import { DrawerNav } from "./DrawerNav"
import { SampleLandingPage } from "./SampleLandingPage"

export function HomeShellPage({
  route,
  onNavigate,
}: {
  route: AppRoute
  onNavigate: (path: AppRoute) => void
}) {
  return (
    <div className="app-shell">
      <DrawerNav route={route} onNavigate={onNavigate} />
      <SampleLandingPage route={route} />
    </div>
  )
}
