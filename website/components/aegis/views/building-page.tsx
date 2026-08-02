'use client'

import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Building2,
  Users,
  Thermometer,
  Wind,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Wifi,
  Video,
  Layers,
  Cpu,
} from 'lucide-react'
import { buildings, statusColor, type Status } from '@/lib/data'
import { useAegis } from '../store'
import { GlassCard, SectionLabel, StatusDot, statusText } from '../primitives'
import { FloorPlan } from '../floor-plan'
import { cn } from '@/lib/utils'
import { useBuildingStats, useNodes } from '@/lib/use-backend'

export function BuildingPage() {
  const { selectedBuilding, setView } = useAegis()
  const [activeFloorIndex, setActiveFloorIndex] = useState(0)

  // ── Hardcoded structure (rooms + floors) ──────────────────────────────────
  const building = buildings.find((b) => b.id === selectedBuilding) || buildings[0]

  useEffect(() => {
    setActiveFloorIndex(0)
  }, [selectedBuilding])

  const activeFloor = building.floors[activeFloorIndex] || building.floors[0]

  // ── Live data from backend ────────────────────────────────────────────────
  const { data: stats } = useBuildingStats(building.id)
  const { data: allNodes } = useNodes()

  // Filter backend nodes by building name + active floor name
  const floorNodes = (allNodes ?? []).filter(
    (n) => n.building === building.name && n.floor === activeFloor?.name,
  )

  // Resolved display values — backend first, blank ('—') if absent
  const liveStatus: Status = stats?.status ?? 'safe'
  const liveHealthScore = stats?.healthScore
  const liveOccupancy = stats?.occupancy
  const liveTemperature = stats?.temperature
  const liveAirQuality = stats?.airQuality
  const liveEmergency = stats?.emergency ?? false
  const livePower = stats?.power
  const liveInternet = stats?.internet
  const liveCameras = stats?.cameras

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {/* Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('campus')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary/30 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Back to Campus Overview"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              <SectionLabel>Building View</SectionLabel>
            </div>
            <h1 className="glow-text text-3xl font-semibold tracking-tight md:text-4xl">
              {building.name} Control
            </h1>
          </div>
        </div>

        {/* Building Health & Status */}
        <div className="flex items-center gap-3">
          <GlassCard className="flex items-center gap-2.5 px-4 py-2" glow={stats ? liveStatus : undefined}>
            {stats ? (
              <>
                <StatusDot status={liveStatus} />
                <span className="text-xs font-medium uppercase tracking-wider">{statusText(liveStatus)}</span>
              </>
            ) : (
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">— Status</span>
            )}
          </GlassCard>
          <GlassCard className="px-4 py-2" glow="primary">
            <span className="font-mono text-lg font-bold text-primary">
              {liveHealthScore != null ? `${liveHealthScore}% Health` : '— Health'}
            </span>
          </GlassCard>
        </div>
      </div>

      {/* Building Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="p-4 flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <Users className="size-6 text-primary" />
          </div>
          <div>
            <SectionLabel>Occupancy</SectionLabel>
            <p className="text-xl font-semibold font-mono mt-0.5">
              {liveOccupancy != null ? `${liveOccupancy} Active` : '—'}
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-orange-500/10">
            <Thermometer className="size-6 text-orange-500" />
          </div>
          <div>
            <SectionLabel>Avg Temp</SectionLabel>
            <p className="text-xl font-semibold font-mono mt-0.5">
              {liveTemperature != null ? `${liveTemperature}°C` : '—'}
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-cyan-500/10">
            <Wind className="size-6 text-cyan-500" />
          </div>
          <div>
            <SectionLabel>Air Quality</SectionLabel>
            <p className="text-xl font-semibold font-mono mt-0.5">
              {liveAirQuality != null ? `${liveAirQuality} AQI` : '—'}
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--safe)1f' }}>
            {liveEmergency ? (
              <ShieldAlert className="size-6" style={{ color: 'var(--critical)' }} />
            ) : (
              <ShieldCheck className="size-6" style={{ color: 'var(--safe)' }} />
            )}
          </div>
          <div>
            <SectionLabel>Emergency System</SectionLabel>
            <p className="text-xl font-semibold mt-0.5" style={{ color: liveEmergency ? 'var(--critical)' : stats ? 'var(--safe)' : 'var(--muted-foreground)' }}>
              {stats == null ? '—' : liveEmergency ? 'Evac Triggered' : 'All Clear'}
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Main Floor Plan Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Floor Plan Display — hardcoded layout */}
        <GlassCard className="flex flex-col p-5 min-h-[480px]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Floor Telemetry &amp; Layout</span>
            </div>
            <div className="flex rounded-xl bg-secondary/30 p-1 border border-border">
              {building.floors.map((f, index) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFloorIndex(index)}
                  className={cn(
                    'relative px-4 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    activeFloorIndex === index
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center relative min-h-[400px]">
            {activeFloor ? (
              <FloorPlan floor={activeFloor} />
            ) : (
              <div className="text-muted-foreground text-sm">No floor plan data available</div>
            )}
          </div>
        </GlassCard>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* System Integrity */}
          <GlassCard className="p-5">
            <SectionLabel>System Integrity</SectionLabel>
            <div className="mt-4 space-y-3">
              <SystemRow icon={Zap} label="Main Grid Power" status={livePower ?? null} />
              <SystemRow icon={Wifi} label="Campus Network" status={liveInternet ?? null} />
              <SystemRow icon={Video} label="Security Feed" status={liveCameras ?? null} />
            </div>
          </GlassCard>

          {/* Active Nodes — from backend /api/nodes */}
          <GlassCard className="flex-1 p-5 overflow-y-auto max-h-[350px]">
            <SectionLabel>Active Nodes ({floorNodes.length})</SectionLabel>
            <div className="mt-4 space-y-3">
              {floorNodes.length === 0 && (
                <p className="text-xs text-muted-foreground italic text-center py-4">
                  No node data for this floor from backend.
                </p>
              )}
              {floorNodes.map((node) => (
                <div
                  key={node.id}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-secondary/15 p-3 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Cpu className="size-3.5 text-primary" />
                      <span className="font-mono text-xs font-bold">{node.id}</span>
                    </div>
                    <StatusDot status={node.status} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{node.room}</p>
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] mt-1">
                    <div className="rounded border border-border/50 bg-background/50 py-1">
                      <span className="text-muted-foreground block">Temp</span>
                      <span className="font-mono font-medium">
                        {node.temperature != null ? `${node.temperature}°C` : '—'}
                      </span>
                    </div>
                    <div className="rounded border border-border/50 bg-background/50 py-1">
                      <span className="text-muted-foreground block">Smoke</span>
                      <span className="font-mono font-medium">
                        {node.smoke != null ? `${node.smoke} ppm` : '—'}
                      </span>
                    </div>
                    <div className="rounded border border-border/50 bg-background/50 py-1">
                      <span className="text-muted-foreground block">WiFi</span>
                      <span className="font-mono font-medium">
                        {node.wifi != null ? `${node.wifi}%` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}

type SystemStatus = 'online' | 'backup' | 'offline' | 'degraded' | 'partial' | null

function SystemRow({ icon: Icon, label, status }: { icon: typeof Zap; label: string; status: SystemStatus }) {
  const map: Record<string, { label: string; color: string }> = {
    online:   { label: 'Online',           color: 'var(--safe)' },
    backup:   { label: 'Backup Power',     color: 'var(--warn)' },
    partial:  { label: 'Partial Coverage', color: 'var(--warn)' },
    degraded: { label: 'Degraded',         color: 'var(--warn)' },
    offline:  { label: 'Offline',          color: 'var(--critical)' },
  }
  const display = status ? (map[status] ?? { label: status, color: 'var(--muted-foreground)' }) : null

  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className="font-mono font-medium" style={{ color: display?.color ?? 'var(--muted-foreground)' }}>
        {display?.label ?? '—'}
      </span>
    </div>
  )
}
