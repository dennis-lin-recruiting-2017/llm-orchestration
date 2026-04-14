import { Box, List, ListItemButton, ListItemText, Typography } from "@mui/material"
import type { AppRoute } from "../lib/types"
import { drawerNavigation } from "../lib/navigation"

type Props = {
  route: AppRoute
  onNavigate: (path: AppRoute) => void
}

export function DrawerNav({ route, onNavigate }: Props) {
  return (
    <Box sx={{ width: 260, flexShrink: 0 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>LLM Orchestration</Typography>
      <List dense disablePadding>
      {drawerNavigation.map((group) => (
        <Box key={group.label}>
          {group.path ? (
            <ListItemButton
              selected={route === group.path}
              onClick={() => onNavigate(group.path as AppRoute)}
            >
              <ListItemText primary={group.label} />
            </ListItemButton>
          ) : (
            <>
              <ListItemButton>
                <ListItemText primary={<Typography sx={{ fontWeight: 700 }}>{group.label}</Typography>} />
              </ListItemButton>
              <List dense disablePadding sx={{ pl: 2 }}>
                {group.children?.map((child) => (
                  <ListItemButton
                    key={child.path}
                    selected={route === child.path}
                    onClick={() => onNavigate(child.path as AppRoute)}
                  >
                    <ListItemText primary={child.label} slotProps={{ primary: { sx: { fontSize: "0.875rem" } } }} />
                  </ListItemButton>
                ))}
              </List>
            </>
          )}
        </Box>
      ))}
      </List>
    </Box>
  )
}
