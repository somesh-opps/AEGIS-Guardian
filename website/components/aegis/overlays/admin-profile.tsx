'use client'

import { motion, AnimatePresence } from 'motion/react'
import { X, User, ShieldAlert, Key, Clock, ShieldCheck, Activity, LogOut, Settings } from 'lucide-react'
import { useAegis } from '../store'
import { cn } from '@/lib/utils'

export function AdminProfileOverlay() {
  const { profileOpen, setProfileOpen } = useAegis()

  return (
    <AnimatePresence>
      {profileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            className="absolute inset-0 bg-background/60"
            onClick={() => setProfileOpen(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border bg-background/90 shadow-2xl backdrop-blur-xl md:flex-row"
          >
            {/* Left Sidebar - Profile Overview */}
            <div className="flex flex-col items-center border-b border-border bg-secondary/30 p-8 md:w-1/3 md:border-b-0 md:border-r">
              <div 
                className="mb-6 flex size-32 items-center justify-center rounded-full shadow-[0_0_40px_rgba(139,92,246,0.3)]"
                style={{ background: 'linear-gradient(135deg, var(--purple), var(--blue))' }}
              >
                <User className="size-16 text-background" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">System Administrator</h2>
              <p className="mt-1 font-mono text-sm text-muted-foreground">ID: ADM-9942-X</p>
              
              <div className="mt-6 flex items-center gap-2 rounded-full border border-safe/30 bg-safe/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-safe">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-safe opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-safe"></span>
                </span>
                Active Session
              </div>

              <div className="mt-auto flex w-full flex-col gap-2 pt-8">
                <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary/50 py-3 text-sm font-medium transition-colors hover:bg-white/10 hover:text-foreground text-muted-foreground">
                  <Settings className="size-4" /> Account Settings
                </button>
                <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/10 py-3 text-sm font-medium text-danger transition-colors hover:bg-danger/20">
                  <LogOut className="size-4" /> Terminate Session
                </button>
              </div>
            </div>

            {/* Right Side - Demo Data */}
            <div className="flex-1 p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold">Clearance & Activity</h3>
                <button
                  onClick={() => setProfileOpen(false)}
                  className="rounded-full bg-secondary/50 p-2 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Clearance Level */}
                <div className="rounded-2xl border border-border bg-secondary/20 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="rounded-full bg-blue-500/20 p-2 text-blue-500">
                      <ShieldCheck className="size-5" />
                    </div>
                    <span className="font-semibold">Clearance Level</span>
                  </div>
                  <p className="text-3xl font-mono font-bold text-primary">LEVEL 5</p>
                  <p className="mt-1 text-xs text-muted-foreground">Full Facility Override Access</p>
                </div>

                {/* Access Zones */}
                <div className="rounded-2xl border border-border bg-secondary/20 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="rounded-full bg-purple-500/20 p-2 text-purple-500">
                      <Key className="size-5" />
                    </div>
                    <span className="font-semibold">Access Zones</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="rounded bg-primary/20 px-2 py-1 text-xs font-bold text-primary">BLDG A</span>
                    <span className="rounded bg-primary/20 px-2 py-1 text-xs font-bold text-primary">BLDG B</span>
                    <span className="rounded bg-primary/20 px-2 py-1 text-xs font-bold text-primary">SERVER RM</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity Log */}
              <div className="mt-8">
                <h4 className="mb-4 text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Activity className="size-4" /> Recent Authorization Logs
                </h4>
                <div className="space-y-3">
                  {[
                    { time: '10:42 AM', action: 'System Diagnostics Initiated', loc: 'Mission Control', type: 'info' },
                    { time: '09:15 AM', action: 'Overrode Door Lock A1-Server', loc: 'Building A', type: 'warn' },
                    { time: '08:00 AM', action: 'Secure Login Success', loc: 'Terminal 4', type: 'safe' },
                  ].map((log, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-border bg-secondary/10 p-4">
                      <div className="flex items-center gap-3">
                        <Clock className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{log.action}</p>
                          <p className="text-xs text-muted-foreground">{log.loc}</p>
                        </div>
                      </div>
                      <span className={cn(
                        "font-mono text-xs font-bold",
                        log.type === 'safe' ? "text-safe" : log.type === 'warn' ? "text-warn" : "text-primary"
                      )}>
                        {log.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
