'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { PlayCircle, GitBranch, MapPin, Activity, Sparkles, Download, ChevronRight } from 'lucide-react'
import type { ReportData, TimelineEvent } from '@/lib/api'
import { GlassCard, SectionLabel } from '../primitives'
import { useReports } from '@/lib/use-backend'

export function Reports() {
  const { data: reports, loading } = useReports()
  const list = reports ?? []
  const [open, setOpen] = useState<ReportData | null>(null)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <SectionLabel>Reports &amp; Emergency Logs</SectionLabel>
        <h1 className="glow-text mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Incident Archive</h1>
      </div>

      {loading && list.length === 0 && (
        <p className="text-sm text-muted-foreground">Loading reports from backend…</p>
      )}

      {!loading && list.length === 0 && (
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-border">
          <p className="text-sm text-muted-foreground italic">No incident reports found.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((r, i) => (
          <GlassCard key={r.id} className="flex flex-col p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{r.id}</span>
              <span className="text-[11px] text-muted-foreground">{r.date}</span>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-balance">{r.title}</h3>
            <div className="mt-3 space-y-2 text-xs">
              <Row icon={GitBranch} label="Root Cause" value={r.cause} />
              <Row icon={MapPin} label="Affected" value={r.areas} />
            </div>
            <button
              onClick={() => setOpen(r)}
              className="mt-4 flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-3 py-2 text-xs transition-colors hover:border-primary/40 hover:text-primary"
            >
              <span className="flex items-center gap-1.5"><PlayCircle className="size-3.5" /> Incident Replay</span>
              <ChevronRight className="size-3.5" />
            </button>
          </GlassCard>
        ))}
      </div>

      <AnimatePresence>
        {open && <ReportModal report={open} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </div>
  )
}

function Row({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div>
        <span className="text-muted-foreground">{label}: </span>
        <span>{value}</span>
      </div>
    </div>
  )
}

function ReportModal({ report, onClose }: { report: ReportData; onClose: () => void }) {
  const timeline: TimelineEvent[] = report.timeline ?? []
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        className="glass relative z-10 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="font-mono text-[11px] text-muted-foreground">{report.id} · {report.date}</span>
            <h2 className="mt-1 text-2xl font-semibold">{report.title}</h2>
          </div>
          <button onClick={onClose} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground">Close</button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Info icon={GitBranch} label="Root Cause Analysis" value={report.cause} />
          <Info icon={MapPin} label="Affected Areas" value={report.areas} />
        </div>

        {/* Timeline — only shown if present in the document */}
        {timeline.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              <SectionLabel>Timeline</SectionLabel>
            </div>
            <div className="space-y-0">
              {timeline.map((e, i) => (
                <div key={i} className="flex gap-3 pb-3 last:pb-0">
                  <div className="flex flex-col items-center">
                    <span className="mt-1 size-2 rounded-full" style={{ backgroundColor: e.severity === 'safe' ? 'var(--safe)' : e.severity === 'warn' ? 'var(--warn)' : 'var(--critical)' }} />
                    {i < timeline.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
                  </div>
                  <div className="-mt-0.5">
                    <span className="font-mono text-[11px] text-muted-foreground">{e.time}</span>
                    <p className="text-sm">{e.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {report.summary && (
          <div className="mt-5 rounded-xl border border-border bg-secondary/30 p-4">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">AI Summary</span>
            </div>
            <p className="text-sm leading-relaxed">{report.summary}</p>
          </div>
        )}

        <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
          <Download className="size-4" /> Export PDF
        </button>
      </motion.div>
    </motion.div>
  )
}

function Info({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-3">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="size-3.5 text-primary" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm">{value}</p>
    </div>
  )
}
