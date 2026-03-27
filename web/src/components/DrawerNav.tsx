import type { AppRoute } from "../lib/types"
import { drawerNavigation } from "../lib/navigation"

type Props = {
  route: AppRoute
  onNavigate: (path: AppRoute) => void
}

export function DrawerNav({ route, onNavigate }: Props) {
  return (
    <aside className="drawer">
      <h2>LLM Orchestration</h2>
      <div className="meta">Navigation drawer with 2-level nesting</div>

      {drawerNavigation.map((group) => (
        <div className="drawer-group" key={group.label}>
          {group.path ? (
            <button
              type="button"
              className={`drawer-item ${route === group.path ? "active" : ""}`}
              onClick={() => onNavigate(group.path as AppRoute)}
            >
              {group.label}
            </button>
          ) : (
            <>
              <div className="drawer-item">{group.label}</div>
              <div className="drawer-sublist">
                {group.children?.map((child) => (
                  <button
                    type="button"
                    key={child.path}
                    className={`drawer-subitem ${route === child.path ? "active" : ""}`}
                    onClick={() => onNavigate(child.path as AppRoute)}
                  >
                    {child.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ))}
    </aside>
  )
}
