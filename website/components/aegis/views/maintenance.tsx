'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { BatteryMedium, Signal, Cpu, CalendarClock, Activity, RotateCw, Wrench } from 'lucide-react'
import { statusColor } from '@/lib/data'
import { GlassCard, SectionLabel, StatusDot } from '../primitives'
import { cn } from '@/lib/utils'
import { useNodes } from '@/lib/use-backend'
import type { NodeData } from '@/lib/api'

export function Maintenance() {
  const { data: nodes, loading } = useNodes()
  const list = nodes ?? []
  const [busy, setBusy] = useState<string | null>(null)

  const runAction = (id: string) => {
    setBusy(id)
    setTimeout(() => setBusy(null), 1800)
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <SectionLabel>Maintenance</SectionLabel>
        <h1 className="glow-text mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Node Fleet</h1>
        <p className="mt-2 text-muted-foreground">
          {loading && list.length === 0
            ? 'Loading node data from backend…'
            : list.length > 0
            ? `${list.length} sensor nodes under active management.`
            : 'No sensor nodes found. Add documents to the nodes_data collection.'}
        </p>
      </div>

      {!loading && list.length === 0 && (
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-border">
          <p className="text-sm text-muted-foreground italic">No node data from backend.</p>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {list.map((n, i) => (
          <GlassCard
            key={n.id}
            glow={n.status}
            className="flex min-h-[300px] flex-col p-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-sm font-bold">{n.id}</p>
                <p className="text-xs text-muted-foreground">{n.building} · {n.floor}</p>
              </div>
              <StatusDot status={n.status} />
            </div>

            <div className="mt-6 grid flex-1 grid-cols-2 gap-5 text-sm">
              <Field icon={BatteryMedium} label="Battery" value={n.battery != null ? `${n.battery}%` : '—'} bar={n.battery} />
              <Field icon={Signal} label="Signal" value={n.signal != null ? `${n.signal} dBm` : '—'} />
              <Field icon={Cpu} label="Firmware" value={n.firmware ?? '—'} />
              <Field icon={CalendarClock} label="Calibrated" value={n.lastCalibration ?? '—'} />
            </div>

            <div className="mt-6 flex items-center gap-2 rounded-xl border border-border bg-secondary/30 p-4">
              <Activity className="size-4" style={{ color: statusColor[n.status] }} />
              <span className="text-sm text-muted-foreground">Health Score</span>
              <span className="ml-auto font-mono text-base font-semibold" style={{ color: statusColor[n.status] }}>
                {n.healthScore != null ? `${n.healthScore}%` : '—'}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <ActionBtn label="Diagnostics" icon={Activity} onClick={() => runAction(n.id + 'd')} busy={busy === n.id + 'd'} />
              <ActionBtn label="Restart" icon={RotateCw} onClick={() => runAction(n.id + 'r')} busy={busy === n.id + 'r'} />
              <ActionBtn label="Schedule" icon={Wrench} onClick={() => runAction(n.id + 's')} busy={busy === n.id + 's'} />
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}

function Field({ icon: Icon, label, value, bar }: { icon: typeof BatteryMedium; label: string; value: string; bar?: number }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </div>
      <p className="mt-1 font-medium">{value}</p>
      {bar !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full" style={{ width: `${bar}%`, backgroundColor: bar < 65 ? 'var(--warn)' : 'var(--safe)' }} />
        </div>
      )}
    </div>
  )
}

function ActionBtn({ label, icon: Icon, onClick, busy }: { label: string; icon: typeof Activity; onClick: () => void; busy: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-lg border border-border py-3 text-xs font-medium transition-colors hover:border-primary/40 hover:text-primary',
        busy && 'border-primary/40 text-primary',
      )}
    >
      <motion.span animate={busy ? { rotate: 360 } : {}} transition={{ duration: 0.9, repeat: busy ? Infinity : 0, ease: 'linear' }}>
        <Icon className="size-4" />
      </motion.span>
      {busy ? 'Running' : label}
    </button>
  )
}
