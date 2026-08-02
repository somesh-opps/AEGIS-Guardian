"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Search, CornerDownLeft } from "lucide-react"
import { useAegis, type View } from "../store"
import { buildings } from "@/lib/data"

type Cmd = { label: string; hint: string; run: () => void }

export function CommandPalette() {
  const { searchOpen, setSearchOpen, setView, openBuilding, triggerEmergency, setVoiceOpen } = useAegis()
  const [q, setQ] = useState("")

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === "Escape") setSearchOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [setSearchOpen])

  useEffect(() => {
    if (!searchOpen) setQ("")
  }, [searchOpen])

  const commands = useMemo<Cmd[]>(() => {
    const nav: { v: View; label: string }[] = [
      { v: "campus", label: "Campus Overview" },
      { v: "mission-control", label: "Mission Control" },
      { v: "analytics", label: "Analytics" },
      { v: "maintenance", label: "Maintenance" },
      { v: "reports", label: "Reports" },
      { v: "sensors", label: "Sensor Network" },
      { v: "settings", label: "Settings" },
    ]
    const navCmds: Cmd[] = nav.map((n) => ({
      label: `Go to ${n.label}`,
      hint: "Navigation",
      run: () => {
        setView(n.v)
        setSearchOpen(false)
      },
    }))
    const buildingCmds: Cmd[] = buildings.map((b) => ({
      label: `Open ${b.name}`,
      hint: "Building",
      run: () => {
        openBuilding(b.id)
        setSearchOpen(false)
      },
    }))
    const actions: Cmd[] = [
      {
        label: "Trigger Emergency Protocol",
        hint: "Action",
        run: () => {
          triggerEmergency()
          setSearchOpen(false)
        },
      },
      {
        label: "Talk to AEGIS",
        hint: "Action",
        run: () => {
          setVoiceOpen(true)
          setSearchOpen(false)
        },
      },
    ]
    return [...navCmds, ...buildingCmds, ...actions]
  }, [setView, openBuilding, triggerEmergency, setVoiceOpen, setSearchOpen])

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()))

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSearchOpen(false)}
          className="fixed inset-0 z-[80] flex items-start justify-center bg-background/70 px-4 pt-[15vh] backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-border/60 bg-card/90 backdrop-blur-2xl shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-border/60 px-4">
              <Search className="size-4 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search buildings, views, or commands…"
                className="w-full bg-transparent py-4 text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                ESC
              </kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No results for &quot;{q}&quot;</p>
              )}
              {filtered.map((c, i) => (
                <button
                  key={i}
                  onClick={c.run}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-primary/10"
                >
                  <span className="text-foreground">{c.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {c.hint}
                    </span>
                    <CornerDownLeft className="size-3.5 text-muted-foreground" />
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
