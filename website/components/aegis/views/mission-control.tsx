'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Activity, Bot, Send, Sparkles, Wifi, WifiOff } from 'lucide-react'
import { buildings, statusColor } from '@/lib/data'
import { GlassCard, SectionLabel, StatusDot, statusText } from '../primitives'
import { CampusMap } from '../campus-map'
import { useAegis } from '../store'
import { useAiChat, useBackendStatus, useLiveFeed } from '@/lib/use-backend'

export function MissionControl() {
  const { openBuilding } = useAegis()
  const { data: liveFeedData } = useLiveFeed()
  const feed = liveFeedData ?? []
  const { messages, thinking, send } = useAiChat()
  const backendOnline = useBackendStatus()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  function handleSend() {
    const text = input.trim()
    if (!text) return
    setInput('')
    send(text)
  }

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <SectionLabel>Mission Control</SectionLabel>
          <h1 className="glow-text text-2xl font-semibold tracking-tight md:text-3xl">Full-Spectrum Monitoring</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
          <motion.span className="size-2 rounded-full" style={{ backgroundColor: 'var(--safe)' }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
          <span className="font-mono text-[11px]">STREAMING · REALTIME</span>
        </div>
      </div>

      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,220px)_1fr_minmax(0,260px)]">
        {/* Left: building status */}
        <div className="flex flex-col gap-3">
          <SectionLabel>Building Status</SectionLabel>
          {buildings.map((b) => (
            <GlassCard key={b.id} glow={b.status} className="cursor-pointer p-3" onClick={() => openBuilding(b.id)}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{b.name}</span>
                <StatusDot status={b.status} />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Health {b.healthScore}%</span>
                <span>{b.occupancy} occ</span>
              </div>
              <p className="mt-1 text-[11px]" style={{ color: statusColor[b.status] }}>{statusText(b.status)}</p>
            </GlassCard>
          ))}
        </div>

        {/* Center: live campus */}
        <GlassCard className="min-h-[360px] p-3">
          <CampusMap onSelect={openBuilding} className="h-full" />
        </GlassCard>

        {/* Right: AI Chat Panel */}
        <div className="flex flex-col gap-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <SectionLabel>AI Commander Chat</SectionLabel>
            <span className="flex items-center gap-1 font-mono text-[10px]" style={{ color: backendOnline ? 'var(--safe)' : 'var(--warn)' }}>
              {backendOnline === null ? null : backendOnline ? (
                <><Wifi className="size-3" /> ONLINE</>
              ) : (
                <><WifiOff className="size-3" /> OFFLINE</>
              )}
            </span>
          </div>

          {/* Chat bubble list */}
          <GlassCard className="flex flex-1 flex-col gap-2 overflow-y-auto p-3" style={{ maxHeight: '340px', minHeight: '200px' }}>
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {msg.role === 'assistant' && (
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <Bot className="size-3.5 text-primary" />
                    </span>
                  )}
                  <div
                    className="max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed"
                    style={{
                      backgroundColor: msg.error
                        ? 'var(--critical)18'
                        : msg.role === 'user'
                        ? 'var(--primary)18'
                        : 'var(--secondary)',
                      color: msg.error ? 'var(--critical)' : 'inherit',
                      border: msg.error ? '1px solid var(--critical)30' : undefined,
                    }}
                  >
                    {msg.content}
                    {msg.provider && (
                      <span className="mt-1 flex items-center gap-1 font-mono text-[9px] opacity-50">
                        <Sparkles className="size-2.5" /> via {msg.provider}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Thinking indicator */}
            {thinking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-2"
              >
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Bot className="size-3.5 text-primary" />
                </span>
                <div className="flex items-center gap-1 rounded-xl bg-secondary px-3 py-2">
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      className="size-1.5 rounded-full bg-primary"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </GlassCard>

          {/* Input row */}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask the AI Commander…"
              disabled={thinking}
              className="flex-1 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs outline-none placeholder:text-muted-foreground focus:border-primary/50 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || thinking}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary transition-colors hover:bg-primary/20 disabled:opacity-40"
            >
              <Send className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom: event feed */}
      <GlassCard className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <Activity className="size-4 text-primary" />
          <SectionLabel>Real-time Event Feed</SectionLabel>
        </div>
        <div className="h-28 overflow-hidden">
          {feed.length === 0 ? (
            <p className="flex h-full items-center justify-center text-xs text-muted-foreground italic">No events from backend.</p>
          ) : (
            <AnimatePresence initial={false}>
              {feed.map((evt, i) => (
                <motion.div
                  key={`${evt.timestamp}-${i}`}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: i === 0 ? 1 : Math.max(0.1, 0.55 - i * 0.05), x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 py-0.5 font-mono text-[11px]"
                >
                  <span className="text-muted-foreground">
                    {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString('en-US', { hour12: false }) : '——'}
                  </span>
                  <span className="size-1 rounded-full bg-primary" />
                  <span>{evt.message}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </GlassCard>
    </div>
  )
}
