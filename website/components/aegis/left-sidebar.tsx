'use client'

import { motion } from 'motion/react'
import {
  LayoutGrid,
  Building2,
  Cpu,
  Wrench,
  Bot,
  Siren,
} from 'lucide-react'
import { useAegis, type View } from './store'
import { StatusDot } from './primitives'
import { cn } from '@/lib/utils'
import { useBuildingStats } from '@/lib/use-backend'

export function LeftSidebar() {
  const { view, setView, selectedBuilding, openBuilding } = useAegis()

  const topItems: { label: string; view: View; icon: typeof LayoutGrid }[] = [
    { label: 'Campus Overview', view: 'campus', icon: LayoutGrid },
  ]

  const facilities = [
    { id: 'building-a', label: 'Building A', icon: Building2 },
    { id: 'building-b', label: 'Building B', icon: Building2 },
  ]

  const systemItems: { label: string; view: View; icon: typeof LayoutGrid }[] = [
    { label: 'Sensor Nodes', view: 'sensors', icon: Cpu },
    { label: 'Maintenance', view: 'maintenance', icon: Wrench },
    { label: 'AI Commander', view: 'mission-control', icon: Bot },
    { label: 'Emergency Logs', view: 'reports', icon: Siren },
  ]

  return (
    <aside className="glass hidden w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border p-4 md:flex">
      <NavGroup label="Overview">
        {topItems.map((item) => (
          <NavButton
            key={item.label}
            active={view === item.view}
            icon={item.icon}
            label={item.label}
            onClick={() => setView(item.view)}
          />
        ))}
      </NavGroup>

      <NavGroup label="Buildings">
        {facilities.map((f) => (
          <BuildingNavButton key={f.id} id={f.id} label={f.label} />
        ))}
      </NavGroup>

      <NavGroup label="Systems">
        {systemItems.map((item) => (
          <NavButton
            key={item.label}
            active={view === item.view}
            icon={item.icon}
            label={item.label}
            onClick={() => setView(item.view)}
          />
        ))}
      </NavGroup>
    </aside>
  )
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="mb-1 px-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

function NavButton({
  active,
  icon: Icon,
  label,
  onClick,
  trailing,
}: {
  active: boolean
  icon: typeof LayoutGrid
  label: string
  onClick: () => void
  trailing?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-xl border border-primary/30 bg-primary/10"
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        />
      )}
      <Icon className={cn('relative z-10 size-4', active && 'text-primary')} />
      <span className="relative z-10 flex-1 text-left">{label}</span>
      {trailing && <span className="relative z-10">{trailing}</span>}
    </button>
  )
}

function BuildingNavButton({ id, label }: { id: string; label: string }) {
  const { view, selectedBuilding, openBuilding } = useAegis()
  const { data: stats } = useBuildingStats(id)
  const active = view === 'building' && selectedBuilding === id
  return (
    <NavButton
      active={active}
      icon={Building2}
      label={label}
      onClick={() => openBuilding(id)}
      trailing={stats?.status ? <StatusDot status={stats.status} /> : undefined}
    />
  )
}
