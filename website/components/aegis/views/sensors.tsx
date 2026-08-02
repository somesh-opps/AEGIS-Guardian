'use client'

import { motion } from 'motion/react'
import { Cpu, Thermometer, Wind, Droplets, Cloud, Zap, Flame, Activity, ShieldAlert } from 'lucide-react'
import { statusColor } from '@/lib/data'
import { GlassCard, SectionLabel, StatusDot, useLiveValue } from '../primitives'
import { useNodes } from '@/lib/use-backend'
import type { NodeData } from '@/lib/api'

export function Sensors() {
  const { data: nodes, loading } = useNodes()
  const list = nodes ?? []

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <SectionLabel>Sensor Nodes</SectionLabel>
        <h1 className="glow-text mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Live Telemetry Grid</h1>
        <p className="mt-2 text-muted-foreground">
          {loading && list.length === 0
            ? 'Loading node data from backend…'
            : list.length > 0
            ? `${list.length} nodes streaming across the campus mesh.`
            : 'No sensor nodes found. Add documents to the nodes_data collection.'}
        </p>
      </div>

      {list.length === 0 && !loading && (
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-border">
          <p className="text-sm text-muted-foreground italic">No node data from backend.</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((n, i) => (
          <NodeTile key={n.id} node={n} index={i} />
        ))}
      </div>
    </div>
  )
}

function NodeTile({ node, index }: { node: NodeData; index: number }) {
  // Use raw values instead of simulated jitter for these accurate readings
  const temp = node.temperature != null ? node.temperature.toFixed(1) : '—'
  const smoke = node.smoke != null ? node.smoke : '—'
  const hum = node.humidity != null ? node.humidity.toFixed(1) : '—'
  const gas = node.gas != null ? node.gas : '—'
  const current = node.current != null ? node.current.toFixed(1) : '—'

  return (
    <GlassCard glow={node.status} className="flex flex-col p-6 min-h-[280px]" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="size-4 text-primary" />
          <span className="font-mono text-xs font-bold">{node.id}</span>
        </div>
        <StatusDot status={node.status} />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{node.building} · {node.room}</p>

      <div className="mt-6 grid flex-1 grid-cols-4 gap-3 text-center">
        <Live icon={Thermometer} value={`${temp}°`} color="var(--danger)" label="Temp" />
        <Live icon={Wind} value={String(smoke)} color="var(--warn)" label="Smoke" />
        <Live icon={Cloud} value={String(gas)} color="var(--purple)" label="Gas" />
        <Live icon={Droplets} value={`${hum}%`} color="var(--cyan)" label="Humid" />
        <Live icon={Zap} value={`${current}A`} color="var(--primary)" label="Power" />
        <Live icon={Activity} value={node.motion ? 'YES' : 'NO'} color={node.motion ? "var(--primary)" : "var(--muted)"} label="Motion" />
        <Live icon={Flame} value={node.flame ? 'YES' : 'NO'} color={node.flame ? "var(--danger)" : "var(--muted)"} label="Flame" />
        <Live icon={ShieldAlert} value={node.panic ? 'YES' : 'NO'} color={node.panic ? "var(--danger)" : "var(--muted)"} label="Panic" />
      </div>

      <div className="mt-6 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>WiFi {node.wifi != null ? `${node.wifi}%` : '—'}</span>
        <span>Batt {node.battery != null ? `${node.battery}%` : '—'}</span>
        <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.6, repeat: Infinity }} style={{ color: statusColor[node.status] }}>
          ● live
        </motion.span>
      </div>
    </GlassCard>
  )
}

function Live({ icon: Icon, value, color, label }: { icon: any; value: string; color: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-secondary/30 py-4">
      <Icon className="size-5" style={{ color }} />
      <p className="mt-2 font-mono text-sm font-semibold">{value}</p>
      <p className="mt-1 text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  )
}
