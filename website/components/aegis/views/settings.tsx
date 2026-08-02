'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { Bell, ShieldCheck, Bot, Radio, Gauge, Moon } from 'lucide-react'
import { GlassCard, SectionLabel } from '../primitives'
import { cn } from '@/lib/utils'

const groups = [
  {
    label: 'Alerts',
    items: [
      { id: 'push', icon: Bell, title: 'Push Notifications', desc: 'Real-time incident alerts', on: true },
      { id: 'critical', icon: ShieldCheck, title: 'Critical Escalation', desc: 'Auto-page on-call responders', on: true },
    ],
  },
  {
    label: 'Autonomy',
    items: [
      { id: 'ai', icon: Bot, title: 'AI Auto-Response', desc: 'Allow AEGIS to isolate circuits', on: false },
      { id: 'predict', icon: Gauge, title: 'Predictive Analysis', desc: 'Forecast risk 30 min ahead', on: true },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'stream', icon: Radio, title: 'High-Frequency Streaming', desc: '1s telemetry refresh', on: true },
      { id: 'dark', icon: Moon, title: 'Dark Interface', desc: 'Optimized for control rooms', on: true },
    ],
  },
]

export function Settings() {
  const [state, setState] = useState<Record<string, boolean>>(
    Object.fromEntries(groups.flatMap((g) => g.items.map((i) => [i.id, i.on]))),
  )

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <SectionLabel>Settings</SectionLabel>
        <h1 className="glow-text mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Control Preferences</h1>
      </div>

      {groups.map((g) => (
        <GlassCard key={g.label} className="p-5">
          <SectionLabel>{g.label}</SectionLabel>
          <div className="mt-3 divide-y divide-border">
            {g.items.map((item) => {
              const on = state[item.id]
              return (
                <div key={item.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-secondary/50">
                      <item.icon className="size-4 text-primary" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setState((p) => ({ ...p, [item.id]: !p[item.id] }))}
                    className={cn('flex h-6 w-11 items-center rounded-full p-0.5 transition-colors', on ? 'bg-primary' : 'bg-secondary')}
                    aria-label={item.title}
                  >
                    <motion.span layout className="size-5 rounded-full bg-background shadow" style={{ marginLeft: on ? 'auto' : 0 }} />
                  </button>
                </div>
              )
            })}
          </div>
        </GlassCard>
      ))}
    </div>
  )
}
