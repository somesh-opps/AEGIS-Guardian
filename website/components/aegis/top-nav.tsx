'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Search, Bell, Shield, Radio, User, Settings, LogOut } from 'lucide-react'
import { useAegis, type View } from './store'
import { useCampusData } from '@/lib/use-backend'
import { cn } from '@/lib/utils'

const centerLinks: { label: string; view: View }[] = [
  { label: 'Campus', view: 'campus' },
  { label: 'Mission Control', view: 'mission-control' },
  { label: 'Buildings', view: 'building' },
  { label: 'Analytics', view: 'analytics' },
  { label: 'Reports', view: 'reports' },
  { label: 'Settings', view: 'settings' },
]

export function TopNav() {
  const { view, setView, setSearchOpen, setNotifOpen, unread, emergency } = useAegis()
  const [profileOpen, setProfileOpen] = useState(false)
  const { data: campus } = useCampusData()

  return (
    <header className="glass sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-border px-4 md:px-6">
      <button onClick={() => setView('campus')} className="flex items-center gap-2.5">
        <div
          className="flex size-9 items-center justify-center rounded-xl"
          style={{
            background: emergency
              ? 'linear-gradient(135deg, var(--critical), var(--danger))'
              : 'linear-gradient(135deg, var(--cyan), var(--blue))',
          }}
        >
          <Shield className="size-5 text-background" strokeWidth={2.5} />
        </div>
        <div className="hidden leading-none sm:block">
          <p className="glow-text font-mono text-sm font-bold tracking-[0.2em]">AEGIS</p>
          <p className="mt-1 text-[10px] tracking-wide text-muted-foreground">MISSION CONTROL</p>
        </div>
      </button>

      <nav className="hidden items-center gap-1 rounded-full border border-border bg-secondary/40 p-1 lg:flex">
        {centerLinks.map((link) => {
          const active = view === link.view
          return (
            <button
              key={link.label}
              onClick={() => setView(link.view)}
              className={cn(
                'relative rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
                active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10">{link.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-full border border-border px-3 py-1.5 md:flex">
          <Radio className="size-3.5 text-safe" style={{ color: 'var(--safe)' }} />
          <span className="font-mono text-[11px] text-muted-foreground">LIVE · {campus?.activeNodes ?? '—'} NODES</span>
        </div>
        <button
          onClick={() => setSearchOpen(true)}
          className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Search"
        >
          <Search className="size-4" />
        </button>
        <button
          onClick={() => setNotifOpen(true)}
          className="relative flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full text-[9px] font-bold text-background"
              style={{ backgroundColor: 'var(--danger)' }}
            >
              {unread}
            </span>
          )}
        </button>
        
        {/* Profile Button */}
        <button 
          onClick={() => setProfileOpen(true)}
          className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 hover:bg-white/5 transition-colors" 
          aria-label="Profile"
        >
          <span
            className="flex size-7 items-center justify-center rounded-full text-xs font-bold text-background shadow-inner"
            style={{ background: 'linear-gradient(135deg, var(--purple), var(--blue))' }}
          >
            AD
          </span>
          <span className="hidden text-xs font-medium sm:block">Admin</span>
        </button>
      </div>
    </header>
  )
}
