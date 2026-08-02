'use client'

import { motion, AnimatePresence } from 'motion/react'
import { Flame, MapPin, Percent, Timer, Navigation, X, DoorOpen } from 'lucide-react'
import { useAegis } from '../store'

export function EmergencyMode() {
  const { emergency, clearEmergency } = useAegis()

  return (
    <AnimatePresence>
      {emergency && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center"
        >
          {/* Dark red backdrop */}
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 30%, oklch(0.2 0.08 25 / 92%), oklch(0.08 0.02 20 / 96%))' }} />

          {/* Pulsing vignette */}
          <motion.div
            className="pointer-events-none absolute inset-0"
            style={{ boxShadow: 'inset 0 0 200px 40px var(--critical)' }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />

          {/* Alarm banner */}
          <motion.div
            initial={{ y: -80 }}
            animate={{ y: 0 }}
            className="absolute inset-x-0 top-0 flex items-center justify-center gap-3 py-3"
            style={{ background: 'linear-gradient(90deg, var(--critical), var(--danger))' }}
          >
            <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
              <Flame className="size-5 text-background" />
            </motion.span>
            <span className="font-mono text-sm font-bold uppercase tracking-[0.3em] text-background">
              Emergency Protocol Active
            </span>
          </motion.div>

          {/* Popup */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 grid w-full max-w-4xl gap-4 p-4 md:grid-cols-2"
          >
            <div className="glass rounded-2xl border p-6" style={{ borderColor: 'var(--critical)55', boxShadow: '0 0 60px -10px var(--critical)' }}>
              <div className="flex items-center gap-3">
                <motion.div
                  className="flex size-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: 'var(--critical)25' }}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Flame className="size-6" style={{ color: 'var(--critical)' }} />
                </motion.div>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-wider" style={{ color: 'var(--danger)' }}>Threat Detected</p>
                  <h2 className="text-2xl font-bold">Electrical Fire</h2>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <Row icon={MapPin} label="Location" value="Building A · Floor 1" />
                <Row icon={Percent} label="Confidence" value="92%" accent="var(--critical)" />
                <Row icon={Timer} label="Estimated Spread" value="3 Minutes" accent="var(--danger)" />
                <Row icon={DoorOpen} label="Recommended Action" value="Evacuate via West Exit" />
              </div>

              <button
                onClick={clearEmergency}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-background"
                style={{ background: 'linear-gradient(90deg, var(--safe), oklch(0.7 0.15 160))' }}
              >
                <X className="size-4" /> Resolve & Stand Down
              </button>
            </div>

            {/* Evacuation route */}
            <div className="glass aegis-grid relative overflow-hidden rounded-2xl border p-4" style={{ borderColor: 'var(--critical)33' }}>
              <div className="mb-2 flex items-center gap-2">
                <Navigation className="size-4" style={{ color: 'var(--safe)' }} />
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Evacuation Route</span>
              </div>
              <svg viewBox="0 0 100 80" className="h-full w-full">
                {/* rooms */}
                <rect x="6" y="8" width="34" height="28" rx="2" fill="var(--critical)18" stroke="var(--critical)55" strokeWidth="0.4" />
                <rect x="46" y="8" width="48" height="28" rx="2" fill="var(--muted)" fillOpacity="0.1" stroke="var(--border)" strokeWidth="0.4" />
                <rect x="6" y="44" width="88" height="16" rx="2" fill="var(--muted)" fillOpacity="0.08" stroke="var(--border)" strokeWidth="0.4" />
                <text x="10" y="20" fill="var(--critical)" fontSize="3.4" fontFamily="monospace">FIRE · ELEC LAB</text>
                <text x="50" y="20" fill="var(--muted-foreground)" fontSize="3.4" fontFamily="monospace">SERVER</text>

                {/* route path */}
                <motion.path
                  d="M23 30 L23 52 L88 52"
                  fill="none"
                  stroke="var(--safe)"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeDasharray="4 3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.4, delay: 0.3 }}
                />
                <motion.circle r="1.8" fill="var(--safe)"
                  animate={{ offsetDistance: ['0%', '100%'] }}
                  style={{ offsetPath: 'path("M23 30 L23 52 L88 52")' } as never}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
                />
                {/* exit marker */}
                <circle cx="88" cy="52" r="3" fill="var(--safe)" />
                <text x="80" y="66" fill="var(--safe)" fontSize="3.4" fontFamily="monospace">WEST EXIT</text>
              </svg>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Row({ icon: Icon, label, value, accent }: { icon: typeof MapPin; label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" /> {label}
      </span>
      <span className="font-semibold" style={accent ? { color: accent } : undefined}>{value}</span>
    </div>
  )
}
