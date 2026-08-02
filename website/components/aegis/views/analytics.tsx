'use client'

import { motion } from 'motion/react'
import { TrendingUp, AlertTriangle, Gauge, Timer, Flame, PieChart } from 'lucide-react'
import { statusColor } from '@/lib/data'
import { GlassCard, SectionLabel } from '../primitives'
import { useAnalytics } from '@/lib/use-backend'

export function Analytics() {
  const { data: analytics, loading } = useAnalytics()

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <SectionLabel>Analytics</SectionLabel>
        <h1 className="glow-text mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Intelligence Overview</h1>
      </div>

      {loading && !analytics && (
        <p className="text-sm text-muted-foreground">Loading analytics from backend…</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Health trend */}
        <GlassCard className="p-5 xl:col-span-2" glow="primary">
          <Header icon={TrendingUp} title="Campus Health Trend" value={analytics?.healthTrend?.length ? `${analytics.healthTrend[analytics.healthTrend.length - 1]}%` : undefined} />
          {analytics?.healthTrend?.length ? (
            <Sparkline data={analytics.healthTrend} />
          ) : (
            <EmptyChart height="h-28" />
          )}
        </GlassCard>

        {/* Reliability gauge */}
        <GlassCard className="flex flex-col items-center p-5">
          <Header icon={Gauge} title="Sensor Reliability" />
          {analytics?.sensorReliability != null ? (
            <Gaugev value={analytics.sensorReliability} />
          ) : (
            <EmptyGauge />
          )}
        </GlassCard>

        {/* Incident frequency */}
        <GlassCard className="p-5">
          <Header icon={AlertTriangle} title="Incident Frequency" value={analytics?.incidentFrequency ? '12 mo' : undefined} />
          {analytics?.incidentFrequency?.length ? (
            <Bars data={analytics.incidentFrequency} color="var(--warn)" />
          ) : (
            <EmptyChart height="h-28" />
          )}
        </GlassCard>

        {/* Response time */}
        <GlassCard className="p-5">
          <Header icon={Timer} title="Response Time" value={analytics?.responseTimes ? 'sec avg' : undefined} />
          {analytics?.responseTimes?.length ? (
            <Bars data={analytics.responseTimes} color="var(--cyan)" unit="s" />
          ) : (
            <EmptyChart height="h-28" />
          )}
        </GlassCard>

        {/* Node distribution donut */}
        <GlassCard className="p-5">
          <Header icon={PieChart} title="Node Health" />
          {analytics?.nodeHealthDistribution?.length ? (
            <Donut data={analytics.nodeHealthDistribution} />
          ) : (
            <EmptyGauge />
          )}
        </GlassCard>

        {/* High risk areas */}
        <GlassCard className="p-5 xl:col-span-3">
          <Header icon={Flame} title="High Risk Areas" />
          {analytics?.highRiskAreas?.length ? (
            <div className="mt-4 space-y-3">
              {analytics.highRiskAreas.map((a) => {
                const color = a.risk > 65 ? 'var(--critical)' : a.risk > 45 ? 'var(--warn)' : 'var(--safe)'
                return (
                  <div key={a.area}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{a.area}</span>
                      <span className="font-mono" style={{ color }}>{a.risk}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <motion.div className="h-full rounded-full" style={{ backgroundColor: color }} initial={{ width: 0 }} whileInView={{ width: `${a.risk}%` }} viewport={{ once: true }} transition={{ duration: 1 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground italic">No high risk area data from backend.</p>
          )}
        </GlassCard>
      </div>
    </div>
  )
}

function Header({ icon: Icon, title, value }: { icon: typeof TrendingUp; title: string; value?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <SectionLabel>{title}</SectionLabel>
      </div>
      {value && <span className="font-mono text-sm text-muted-foreground">{value}</span>}
    </div>
  )
}

function EmptyChart({ height }: { height: string }) {
  return (
    <div className={`mt-4 ${height} flex items-center justify-center rounded-xl border border-dashed border-border`}>
      <span className="text-xs text-muted-foreground italic">No data</span>
    </div>
  )
}

function EmptyGauge() {
  return (
    <div className="relative mt-4 flex items-center justify-center">
      <div className="flex size-36 items-center justify-center">
        <span className="font-mono text-2xl font-bold text-muted-foreground">—</span>
      </div>
    </div>
  )
}

function Sparkline({ data }: { data: number[] }) {
  const min = Math.min(...data) - 2
  const max = Math.max(...data) + 1
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 100 - ((d - min) / (max - min)) * 100
    return [x, y]
  })
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
  const area = `${path} L100,100 L0,100 Z`
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-4 h-28 w-full">
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d={area} fill="url(#spark)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} vectorEffect="non-scaling-stroke" transform="scale(1,0.4)" />
      <motion.path d={path} fill="none" stroke="var(--cyan)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4 }} transform="scale(1,0.4)" />
    </svg>
  )
}

function Bars({ data, color, unit }: { data: number[]; color: string; unit?: string }) {
  const max = Math.max(...data, 1)
  return (
    <div className="mt-4 flex h-28 items-end gap-1.5">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <motion.div
            className="w-full rounded-t"
            style={{ backgroundColor: color, minHeight: 2 }}
            initial={{ height: 0 }}
            whileInView={{ height: `${(d / max) * 100}%` }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.6 }}
          />
        </div>
      ))}
    </div>
  )
}

function Gaugev({ value }: { value: number }) {
  const r = 40
  const c = 2 * Math.PI * r
  return (
    <div className="relative mt-4 flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="size-36 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--secondary)" strokeWidth="8" />
        <motion.circle
          cx="50" cy="50" r={r} fill="none" stroke="var(--primary)" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (value / 100) * c }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-mono text-2xl font-bold text-primary">{value}%</p>
        <p className="text-[10px] text-muted-foreground">uptime</p>
      </div>
    </div>
  )
}

function Donut({ data }: { data: { label: string; value: number; status: 'safe' | 'warn' | 'critical' }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  let offset = 0
  const r = 40
  const c = 2 * Math.PI * r
  return (
    <div className="mt-4 flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="size-28 -rotate-90">
        {data.map((d) => {
          const frac = d.value / total
          const seg = (
            <circle
              key={d.label}
              cx="50" cy="50" r={r} fill="none"
              stroke={statusColor[d.status]}
              strokeWidth="12"
              strokeDasharray={`${frac * c} ${c}`}
              strokeDashoffset={-offset * c}
            />
          )
          offset += frac
          return seg
        })}
      </svg>
      <div className="space-y-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: statusColor[d.status] }} />
            <span className="text-muted-foreground">{d.label}</span>
            <span className="ml-auto font-mono">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
