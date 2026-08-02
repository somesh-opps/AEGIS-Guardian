'use client'

import { motion } from 'motion/react'
import { Activity, Building2, Cpu, Users, ShieldCheck, ArrowUpRight } from 'lucide-react'
import { GlassCard, SectionLabel, useLiveValue } from '../primitives'
import { CampusMap } from '../campus-map'
import { useAegis } from '../store'
import { useCampusData } from '@/lib/use-backend'

export function CampusOverview() {
  const { openBuilding, setView } = useAegis()
  const { data: campus } = useCampusData()

  // Animate occupancy only if we have real data
  const occupancy = useLiveValue(campus?.occupancy ?? 0, campus ? 6 : 0, 0, 3000)
  
  // Simulated system metrics
  const latency = useLiveValue(24, campus ? 8 : 0, 10, 1500)
  const compute = useLiveValue(42, campus ? 15 : 0, 10, 2000)
  const inference = useLiveValue(68, campus ? 22 : 0, 10, 1200)
  const storage = useLiveValue(28, campus ? 2 : 0, 10, 5000)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <SectionLabel>AEGIS OS · v3.1</SectionLabel>
        <h1 className="glow-text mt-2 text-balance text-4xl font-semibold tracking-tight md:text-5xl">
          Welcome to AEGIS Mission Control
        </h1>
        <p className="mt-3 max-w-xl text-pretty text-muted-foreground">
          The AI Operating System for Smart Infrastructure — real-time sensor intelligence, predictive risk, and
          autonomous incident response.
        </p>
      </motion.div>

      {/* Campus health card */}
      <GlassCard glow="safe" className="p-5 md:p-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex size-16 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--safe)1f' }}>
              <ShieldCheck className="size-8" style={{ color: 'var(--safe)' }} />
            </div>
            <div>
              <SectionLabel>Campus Status</SectionLabel>
              <p className="text-2xl font-semibold" style={{ color: 'var(--safe)' }}>
                {campus?.status ?? '—'}
              </p>
              <p className="text-xs text-muted-foreground">
                {campus ? 'All primary systems nominal' : 'Awaiting backend data…'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <SectionLabel className="justify-end">Health Score</SectionLabel>
            <p className="glow-text font-mono text-5xl font-bold text-primary">
              {campus?.healthScore != null ? `${campus.healthScore}%` : '—'}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat icon={Building2} label="Buildings Online" value={campus?.buildingsOnline != null ? String(campus.buildingsOnline) : '—'} />
          <Stat icon={Cpu} label="Active Sensor Nodes" value={campus?.activeNodes != null ? String(campus.activeNodes) : '—'} />
          <Stat icon={Users} label="Occupancy" value={campus ? String(occupancy) : '—'} />
          <Stat icon={Activity} label="Current Threats" value={campus?.threats ? (campus.threats === 'None' ? 'None' : campus.threats.split(',').pop()?.trim() || '—') : '—'} accent={campus?.threats === 'None' ? 'var(--safe)' : campus ? 'var(--warn)' : undefined} />
        </div>
      </GlassCard>

      {/* Map + side */}
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <GlassCard className="flex flex-col p-4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <SectionLabel>Interactive Campus Map</SectionLabel>
              <p className="text-sm text-muted-foreground">Select a building to zoom in</p>
            </div>
            <button
              onClick={() => setView('mission-control')}
              className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Mission Control <ArrowUpRight className="size-3.5" />
            </button>
          </div>
          <div className="min-h-80 flex-1">
            <CampusMap onSelect={openBuilding} />
          </div>
        </GlassCard>

        <div className="flex flex-col gap-4">
          <GlassCard className="p-5" glow="primary" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <SectionLabel>Live Uplink</SectionLabel>
            <div className="mt-3 space-y-3">
              {[
                { label: 'Sensor Mesh', value: campus ? '99.9% Online' : '—' },
                { label: 'Camera Grid', value: campus ? 'Nominal' : '—' },
                { label: 'Power Systems', value: campus ? 'Stable' : '—' },
                { label: 'Network Latency', value: campus ? `${Math.round(latency)}ms` : '—' },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-mono">{r.value}</span>
                </div>
              ))}
            </div>
          </GlassCard>
          <GlassCard className="flex-1 p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <SectionLabel>System Load</SectionLabel>
            <div className="mt-4 space-y-4">
              <LoadBar label="Compute" value={campus ? compute : null} />
              <LoadBar label="Inference" value={campus ? inference : null} />
              <LoadBar label="Storage" value={campus ? storage : null} />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Activity
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-3">
      <Icon className="size-4 text-muted-foreground" />
      <p className="mt-2 text-xl font-semibold" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

function LoadBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{value != null ? `${value}%` : '—'}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        {value != null && (
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--cyan), var(--purple))' }}
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        )}
      </div>
    </div>
  )
}
