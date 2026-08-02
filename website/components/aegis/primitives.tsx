'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, type HTMLMotionProps } from 'motion/react'
import { cn } from '@/lib/utils'
import type { Status } from '@/lib/data'

export function GlassCard({
  className,
  glow,
  children,
  ...props
}: HTMLMotionProps<'div'> & { glow?: Status | 'primary' }) {
  const glowColor =
    glow === 'safe'
      ? 'var(--safe)'
      : glow === 'warn'
        ? 'var(--warn)'
        : glow === 'critical'
          ? 'var(--critical)'
          : glow === 'primary'
            ? 'var(--primary)'
            : undefined

  return (
    <motion.div
      className={cn(
        'glass relative overflow-hidden rounded-2xl border border-border',
        className,
      )}
      style={
        glowColor
          ? { boxShadow: `0 0 0 1px ${glowColor}20, 0 8px 40px -12px ${glowColor}40` }
          : undefined
      }
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function useLiveValue(base: number, spread: number, decimals = 1, interval = 2200) {
  const [value, setValue] = useState(base)
  const baseRef = useRef(base)
  useEffect(() => {
    const id = setInterval(() => {
      const next = baseRef.current + (Math.random() - 0.5) * spread
      setValue(Number(next.toFixed(decimals)))
    }, interval)
    return () => clearInterval(id)
  }, [spread, decimals, interval])
  return value
}

export function StatusDot({ status, className }: { status: Status; className?: string }) {
  const color = status === 'safe' ? 'var(--safe)' : status === 'warn' ? 'var(--warn)' : 'var(--critical)'
  return (
    <span className={cn('relative inline-flex size-2.5 rounded-full', className)} style={{ backgroundColor: color, color }}>
      <span className="pulse-ring absolute inset-0 rounded-full" />
    </span>
  )
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground', className)}>
      {children}
    </p>
  )
}

export function statusText(status: Status) {
  return status === 'safe' ? 'Safe' : status === 'warn' ? 'Warning' : 'Critical'
}
