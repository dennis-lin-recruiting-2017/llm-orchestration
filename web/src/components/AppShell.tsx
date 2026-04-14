import { useState, type ReactNode } from "react"
import { AppBar, Box, Container, Drawer, IconButton, Toolbar, Typography } from "@mui/material"
import MenuIcon from "@mui/icons-material/Menu"
import type { AppRoute } from "../lib/types"
import { DrawerNav, routeLabels } from "./DrawerNav"

const drawerWidth = 280

type Props = {
  route: AppRoute
  onNavigate: (path: AppRoute) => void
  children: ReactNode
}

export function AppShell({ route, onNavigate, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          borderBottom: "1px solid",
          borderColor: "divider",
          boxShadow: "none",
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen((open) => !open)}
            sx={{ mr: 2, display: { md: "none" } }}
            aria-label="Open navigation"
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="h1" sx={{ fontWeight: 700 }}>
            {routeLabels[route] ?? "LLM Orchestration"}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }} aria-label="Main navigation">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
          }}
        >
          <DrawerNav route={route} onNavigate={onNavigate} onNavigateComplete={() => setMobileOpen(false)} />
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
          }}
          open
        >
          <DrawerNav route={route} onNavigate={onNavigate} />
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, width: { md: `calc(100% - ${drawerWidth}px)` }, bgcolor: "background.default" }}>
        <Toolbar />
        <Container maxWidth="xl" sx={{ py: 3 }}>
          {children}
        </Container>
      </Box>
    </Box>
  )
}
