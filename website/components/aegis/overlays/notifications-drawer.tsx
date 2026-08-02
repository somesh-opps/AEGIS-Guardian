"use client"

import { motion, AnimatePresence } from "motion/react"
import { X, AlertTriangle, ShieldCheck, Zap, Bell } from "lucide-react"
import { useAegis } from "../store"
import { statusColor } from "@/lib/data"

const iconFor = (kind: string) => {
  if (kind === "energy") return Zap
  if (kind === "security") return ShieldCheck
  if (kind === "alert") return AlertTriangle
  return Bell
}

export function NotificationsDrawer() {
  const { notifOpen, setNotifOpen, notifications, dismissNotification } = useAegis()

  return (
    <AnimatePresence>
      {notifOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setNotifOpen(false)}
            className="fixed inset-0 z-[60] bg-background/50 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 z-[61] flex h-full w-full max-w-sm flex-col border-l border-border/60 bg-card/80 backdrop-blur-2xl"
          >
            <header className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Notifications</h2>
                <p className="font-mono text-[11px] text-muted-foreground">Live event stream</p>
              </div>
              <button
                onClick={() => setNotifOpen(false)}
                className="flex size-9 items-center justify-center rounded-full glass text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Close notifications"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {notifications.length === 0 && (
                <p className="pt-16 text-center text-sm text-muted-foreground">All clear. No active events.</p>
              )}
              {notifications.map((n) => {
                const Icon = iconFor(n.kind)
                const color = statusColor(n.severity)
                return (
                  <motion.div
                    key={n.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    className="glass group flex gap-3 rounded-2xl p-3.5"
                  >
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-full"
                      style={{ background: `color-mix(in oklch, ${color} 18%, transparent)`, color }}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight text-foreground">{n.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.body}</p>
                      <span className="mt-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {n.time} · {n.location}
                      </span>
                    </div>
                    <button
                      onClick={() => dismissNotification(n.id)}
                      className="self-start text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                      aria-label="Dismiss notification"
                    >
                      <X className="size-3.5" />
                    </button>
                  </motion.div>
                )
              })}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
