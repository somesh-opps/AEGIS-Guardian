"use client"

import { AnimatePresence, motion } from "motion/react"
import { AegisProvider, useAegis } from "./store"
import { TopNav } from "./top-nav"
import { LeftSidebar } from "./left-sidebar"
import { CampusOverview } from "./views/campus-overview"
import { BuildingPage } from "./views/building-page"
import { MissionControl } from "./views/mission-control"
import { Analytics } from "./views/analytics"
import { Maintenance } from "./views/maintenance"
import { Reports } from "./views/reports"
import { Sensors } from "./views/sensors"
import { Settings } from "./views/settings"
import { EmergencyMode } from "./overlays/emergency-mode"
import { VoiceAssistant } from "./overlays/voice-assistant"
import { NotificationsDrawer } from "./overlays/notifications-drawer"
import { CommandPalette } from "./overlays/command-palette"
import { AdminProfileOverlay } from "./overlays/admin-profile"

function ViewRouter() {
  const { view } = useAegis()
  const map: Record<string, React.ReactNode> = {
    campus: <CampusOverview />,
    building: <BuildingPage />,
    "mission-control": <MissionControl />,
    analytics: <Analytics />,
    maintenance: <Maintenance />,
    reports: <Reports />,
    sensors: <Sensors />,
    settings: <Settings />,
  }
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
      >
        {map[view]}
      </motion.div>
    </AnimatePresence>
  )
}

function ShellInner() {
  return (
    <div className="grid-backdrop flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <TopNav />
      <div className="flex min-h-0 flex-1">
        <LeftSidebar />
        <main className="min-w-0 flex-1 overflow-y-auto px-5 py-6 md:px-8">
          <div className="mx-auto max-w-6xl">
            <ViewRouter />
          </div>
        </main>
      </div>

      <EmergencyMode />
      <VoiceAssistant />
      <NotificationsDrawer />
      <CommandPalette />
      <AdminProfileOverlay />
    </div>
  )
}

export function AegisShell() {
  return (
    <AegisProvider>
      <ShellInner />
    </AegisProvider>
  )
}
