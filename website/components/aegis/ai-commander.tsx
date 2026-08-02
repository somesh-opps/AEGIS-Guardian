'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Bot, Sparkles, MapPin, Timer, DoorOpen, ShieldAlert } from 'lucide-react'
import { GlassCard, SectionLabel } from './primitives'
import { useAegis } from './store'
import { useLiveData } from '@/lib/use-backend'

const thinkingStates = [
  'Analyzing Sensor Data...',
  'Cross Validating...',
  'Checking Camera Feed...',
  'Predicting Risk...',
  'Generating Recommendations...',
]

export function AICommander() {
  const { emergency, triggerEmergency } = useAegis()
  const [thinkIdx, setThinkIdx] = useState(0)
  const { data: liveData } = useLiveData()

  // The backend's live_data collection can optionally carry an 'incident' object
  // and a 'timeline' array. When absent everything shows as '—'.
  const incident = (liveData as Record<string, unknown> | null)?.incident as Record<string, string> | null ?? null
  const timeline = (liveData as Record<string, unknown> | null)?.timeline as { time: string; title: string; severity: string }[] | null ?? []

  useEffect(() => {
    const id = setInterval(() => setThinkIdx((i) => (i + 1) % thinkingStates.length), 2400)
    return () => clearInterval(id)
  }, [])

  return (
    <aside className="hidden w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border p-4 xl:flex">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative flex size-10 items-center justify-center rounded-xl bg-primary/15">
          <Bot className="size-5 text-primary" />
          <motion.span
            className="absolute inset-0 rounded-xl border border-primary/40"
            animate={{ opacity: [0.2, 0.7, 0.2], scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <div>
          <p className="font-mono text-sm font-bold tracking-[0.15em]">AI COMMANDER</p>
          <p className="text-[11px] text-muted-foreground">Autonomous reasoning core</p>
        </div>
      </div>

      {/* Thinking indicator */}
      <GlassCard className="p-4" glow="primary">
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-1.5 rounded-full bg-primary"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
          <span className="ml-1 font-mono text-[11px] uppercase tracking-wider text-primary">Processing</span>
        </div>
        <div className="mt-3 h-6 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={thinkIdx}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-foreground"
            >
              {thinkingStates[thinkIdx]}
            </motion.p>
          </AnimatePresence>
        </div>
      </GlassCard>

      {/* Incident card */}
      <GlassCard className="p-4" glow={incident ? 'warn' : undefined}>
        <div className="flex items-center justify-between">
          <SectionLabel>AI Incident</SectionLabel>
          {incident?.severity && (
            <span
              className="rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase"
              style={{ backgroundColor: 'var(--warn)20', color: 'var(--warn)' }}
            >
              {incident.severity}
            </span>
          )}
        </div>

        <div className="mt-3 space-y-3">
          <IncidentRow icon={MapPin} label="Location" value={incident?.location ?? '—'} />
          {incident?.confidence != null && (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Confidence</span>
                <span className="font-mono font-semibold text-primary">{incident.confidence}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, var(--cyan), var(--blue))' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${incident.confidence}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}
          <IncidentRow icon={Timer} label="Est. Spread" value={incident?.spreadTime ?? '—'} />
          <IncidentRow icon={DoorOpen} label="Suggested Exit" value={incident?.exit ?? '—'} />
          {incident?.recommendation && (
            <div className="rounded-xl border border-border bg-secondary/40 p-3">
              <div className="mb-1 flex items-center gap-1.5">
                <Sparkles className="size-3 text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Recommendation</span>
              </div>
              <p className="text-xs leading-relaxed text-foreground">{incident.recommendation}</p>
            </div>
          )}
          {!incident && (
            <p className="text-xs text-muted-foreground italic">No active incident data from backend.</p>
          )}
        </div>

        {!emergency && incident && (
          <button
            onClick={triggerEmergency}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border py-2 text-xs font-semibold transition-colors"
            style={{ borderColor: 'var(--critical)40', color: 'var(--critical)', backgroundColor: 'var(--critical)12' }}
          >
            <ShieldAlert className="size-3.5" />
            Escalate to Emergency
          </button>
        )}
      </GlassCard>

      {/* Live timeline */}
      <GlassCard className="p-4">
        <SectionLabel>Live Event Timeline</SectionLabel>
        <div className="mt-3">
          {timeline.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No timeline data from backend.</p>
          )}
          {timeline.map((e, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="relative flex gap-3 pb-4 last:pb-0"
            >
              <div className="flex flex-col items-center">
                <span
                  className="mt-1 size-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      e.severity === 'safe' ? 'var(--safe)' : e.severity === 'warn' ? 'var(--warn)' : 'var(--critical)',
                    boxShadow: `0 0 10px ${e.severity === 'safe' ? 'var(--safe)' : e.severity === 'warn' ? 'var(--warn)' : 'var(--critical)'}`,
                  }}
                />
                {i < timeline.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
              </div>
              <div className="-mt-0.5">
                <p className="font-mono text-[11px] text-muted-foreground">{e.time}</p>
                <p className="text-sm">{e.title}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </aside>
  )
}

function IncidentRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}
