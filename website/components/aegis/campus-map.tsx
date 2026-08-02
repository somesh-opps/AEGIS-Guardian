'use client'

import { useState } from 'react'
import { motion, useMotionValue, useTransform, useMotionTemplate } from 'motion/react'
import { Building2, Car, ShieldCheck } from 'lucide-react'
import { campusFeatures, statusColor, buildings, type CampusFeature, type Building, type Room, type Floor, type Status } from '@/lib/data'
import { cn } from '@/lib/utils'

const iconFor = (type: CampusFeature['type']) =>
  type === 'building' ? Building2 : type === 'parking' ? Car : ShieldCheck

function MiniRoom({ r, floorIndex, floor }: { r: Room; floorIndex: number; floor: Floor }) {
  const floorHeight = 50 // Increased floor height
  const zLevel = floorIndex * floorHeight
  
  // Determine room status based on sensor nodes inside
  const roomNodes = floor.nodes.filter(n => n.room === r.name)
  let roomStatus: Status | null = null
  if (roomNodes.length > 0) {
    if (roomNodes.some(n => n.status === 'critical')) roomStatus = 'critical'
    else if (roomNodes.some(n => n.status === 'warn')) roomStatus = 'warn'
    else roomStatus = 'safe'
  }
  const tint = roomStatus ? statusColor[roomStatus] : 'var(--primary)'

  return (
    <motion.div
      className="absolute"
      style={{
        left: `${r.x}%`,
        top: `${r.y}%`,
        width: `${r.w}%`,
        height: `${r.h}%`,
        transformStyle: 'preserve-3d',
      }}
      initial={{ z: 0 }}
      animate={{ z: zLevel }}
      transition={{ duration: 1.2, ease: "easeOut" }}
    >
      {r.kind === 'exit' ? (
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          {/* Mini Staircase */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={`step-${i}`} className="absolute h-full" style={{ left: `${(7 - i) * 12.5}%`, width: '12.5%', transformStyle: 'preserve-3d' }}>
              {/* Tread */}
              <motion.div className="absolute inset-0" style={{ backgroundColor: `color-mix(in srgb, ${tint} 40%, transparent)`, border: `1px solid color-mix(in srgb, ${tint} 60%, transparent)` }} initial={{ z: 0 }} animate={{ z: (i + 1) * (floorHeight / 8) }} transition={{ duration: 1.2, delay: 0.1 + i * 0.05 }} />
              {/* Riser */}
              <motion.div className="absolute top-0 right-0 h-full origin-right" style={{ width: '4.5px', backgroundColor: `color-mix(in srgb, ${tint} 20%, transparent)` }} initial={{ z: 0, rotateY: 90 }} animate={{ z: i * (floorHeight / 8), rotateY: 90 }} transition={{ duration: 1.2, delay: 0.1 + i * 0.05 }} />
            </div>
          ))}
          {/* Outer Staircase Walls */}
          <motion.div className="absolute top-0 left-0 w-full origin-top" style={{ backgroundColor: `color-mix(in srgb, ${tint} 15%, transparent)` }} initial={{ height: 0, rotateX: 90 }} animate={{ height: floorHeight, rotateX: 90 }} transition={{ duration: 1.2 }} />
          <motion.div className="absolute top-0 right-0 h-full origin-right" style={{ backgroundColor: `color-mix(in srgb, ${tint} 20%, transparent)` }} initial={{ width: 0, rotateY: 90 }} animate={{ width: floorHeight, rotateY: 90 }} transition={{ duration: 1.2 }} />
        </div>
      ) : (
        <>
          {/* Floor Slab */}
          <div className="absolute inset-0 border border-primary/20 bg-primary/5" />
          
          {/* Room Walls */}
          <motion.div className="absolute top-0 left-0 w-full origin-top border border-primary/20 bg-primary/10" initial={{ height: 0, rotateX: 90 }} animate={{ height: floorHeight, rotateX: 90 }} transition={{ duration: 1.2, ease: "easeOut" }} />
          <motion.div className="absolute top-0 right-0 h-full origin-right border border-primary/20 bg-primary/10" initial={{ width: 0, rotateY: 90 }} animate={{ width: floorHeight, rotateY: 90 }} transition={{ duration: 1.2, ease: "easeOut" }} />
          <motion.div className="absolute bottom-0 left-0 w-full origin-bottom border border-primary/20 bg-primary/20" initial={{ height: 0, rotateX: -90 }} animate={{ height: floorHeight, rotateX: -90 }} transition={{ duration: 1.2, ease: "easeOut" }} />
          <motion.div className="absolute top-0 left-0 h-full origin-left border border-primary/20 bg-primary/20" initial={{ width: 0, rotateY: -90 }} animate={{ width: floorHeight, rotateY: -90 }} transition={{ duration: 1.2, ease: "easeOut" }} />
          
          {/* Room Ceiling */}
          <motion.div className="absolute inset-0 border border-primary/20 bg-primary/5 pointer-events-none" initial={{ z: 0 }} animate={{ z: floorHeight }} transition={{ duration: 1.2, ease: "easeOut" }} />
        </>
      )}

      {/* Mini Room Label */}
      <motion.span
        className="pointer-events-none absolute text-[5px] font-bold uppercase tracking-wide text-primary/80"
        style={{ left: '5%', top: '5%' }}
        initial={{ z: 0, opacity: 0 }}
        animate={{ z: floorHeight + 1, opacity: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
      >
        {r.name}
      </motion.span>
    </motion.div>
  )
}

function MiniBuilding({ building, className, onClick, nodeTransform }: { building: Building, className?: string, onClick?: () => void, nodeTransform: any }) {
  return (
    <div 
      className={cn("absolute border border-primary/20 bg-primary/5 shadow-2xl transition-transform hover:-translate-y-2 cursor-pointer", className)} 
      style={{ transformStyle: 'preserve-3d' }}
      onClick={onClick}
    >
      {/* Render all floors and rooms */}
      {building.floors.map((f, i) => (
        <div key={f.id} className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          {f.rooms.map(r => (
            <MiniRoom key={r.id} r={r} floorIndex={i} floor={f} />
          ))}

          {/* Render Sensor Nodes */}
          {f.nodes.map(n => {
            const color = statusColor[n.status]
            const zLevel = (i * 50) + 12 // Float just above the floor
            return (
              <motion.div
                key={n.id}
                className="absolute flex items-center justify-center pointer-events-none"
                style={{
                  left: `${n.x}%`,
                  top: `${n.y}%`,
                  transformStyle: 'preserve-3d',
                }}
                initial={{ z: 0, opacity: 0 }}
                animate={{ z: zLevel, opacity: 1 }}
                transition={{ duration: 1.2, delay: 0.5 }}
              >
                {/* Counter-rotate the dot to face camera */}
                <motion.div style={{ transform: nodeTransform, transformStyle: 'preserve-3d' }} className="relative flex items-center justify-center">
                  <motion.span
                    className="absolute rounded-full"
                    style={{ backgroundColor: color, width: 14, height: 14, opacity: 0.2 }}
                    animate={{ scale: n.status === 'safe' ? [1, 2, 1] : [1, 3, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: n.status === 'critical' ? 1 : 2.2, repeat: Infinity }}
                  />
                  <span
                    className="relative block size-2 rounded-full border border-white/30"
                    style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                  />
                  {/* Stem downwards to the floor */}
                  <div 
                    className="absolute h-4 w-px origin-bottom bg-gradient-to-t from-transparent to-current opacity-60"
                    style={{ color, bottom: '50%' }}
                  />
                </motion.div>
              </motion.div>
            )
          })}
        </div>
      ))}

      {/* Floating Building Label (No outer roof/walls) */}
      <motion.div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" initial={{ z: 0 }} animate={{ z: 100 }} transition={{ duration: 1.2 }}>
         <span className="text-[10px] font-bold text-primary drop-shadow-md">{building.name}</span>
      </motion.div>
    </div>
  )
}

export function CampusMap({
  onSelect,
  emergencyId,
  className,
}: {
  onSelect?: (id: string) => void
  emergencyId?: string | null
  className?: string
}) {
  // Manual drag-to-rotate mechanics
  const rotateX = useMotionValue(55)
  const rotateZ = useMotionValue(-45)
  const invRotateX = useTransform(rotateX, x => -x)
  const invRotateZ = useTransform(rotateZ, z => -z)
  const nodeTransform = useMotionTemplate`rotateZ(${invRotateZ}deg) rotateX(${invRotateX}deg)`

  return (
    <div className={cn('relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-background/40', className)} style={{ perspective: '1200px' }}>
      
      <motion.div
        className="aegis-grid absolute h-[180%] w-[180%] cursor-grab active:cursor-grabbing"
        style={{ 
          rotateX, 
          rotateZ, 
          transformStyle: 'preserve-3d',
          touchAction: 'none'
        }}
        onPan={(e, info) => {
          rotateZ.set(rotateZ.get() + info.delta.x * 0.4)
          let newX = rotateX.get() - info.delta.y * 0.4
          newX = Math.max(0, Math.min(85, newX))
          rotateX.set(newX)
        }}
      >
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 size-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--blue), transparent 70%)', transform: 'translateZ(-2px)' }}
        />

        {/* --- 3D STRUCTURAL LAYOUT --- */}
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          {/* Base Campus Bounds */}
          <div className="absolute inset-4 border-2 border-primary/20 bg-background/60 shadow-[0_0_50px_rgba(0,0,0,0.8)]" />

          {/* Central Road */}
          <div className="absolute left-[46%] top-[5%] bottom-[20%] w-[8%] border-x border-border/50 bg-secondary/30 flex flex-col items-center justify-evenly py-10">
            {/* Dashed line */}
            <div className="w-[2px] h-[10%] bg-white/40" />
            <div className="w-[2px] h-[10%] bg-white/40" />
            <div className="w-[2px] h-[10%] bg-white/40" />
            <div className="w-[2px] h-[10%] bg-white/40" />
          </div>

          {/* Horizontal Road */}
          <div className="absolute left-[10%] top-[72%] h-[8%] w-[80%] border-y border-border/50 bg-secondary/30" />
          
          {/* Main Entrance */}
          <div className="absolute top-[2%] left-[38%] h-[8%] w-[24%] rounded border border-border/50 bg-secondary/50 flex items-center justify-center shadow-lg">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest text-center leading-none" style={{ transform: 'rotateZ(0deg)' }}>Main<br/>Entrance</span>
          </div>

          {/* Garden / Open Area */}
          <div className="absolute top-[83%] left-[40%] h-[12%] w-[45%] rounded-md border border-safe/40 bg-safe/10 flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, var(--safe) 0, var(--safe) 2px, transparent 2px, transparent 8px)' }} />
             <span className="relative z-10 text-[9px] text-safe/90 uppercase font-bold tracking-widest drop-shadow-md">Garden / Open Area</span>
          </div>

          {/* Parking Area */}
          <div className="absolute top-[83%] left-[10%] h-[12%] w-[25%] rounded-md border border-border/40 bg-secondary/20 p-2 flex gap-3">
             <div className="h-full w-5 rounded-sm bg-blue-500/50 border border-blue-400 shadow-md" />
             <div className="h-full w-5 rounded-sm bg-red-500/50 border border-red-400 shadow-md" />
          </div>

          {/* Internal Building Structures (A & B) */}
          <MiniBuilding building={buildings.find(b => b.id === 'building-a')!} className="top-[15%] left-[10%] h-[45%] w-[32%]" onClick={() => onSelect?.('building-a')} nodeTransform={nodeTransform} />
          <MiniBuilding building={buildings.find(b => b.id === 'building-b')!} className="top-[15%] left-[58%] h-[45%] w-[32%]" onClick={() => onSelect?.('building-b')} nodeTransform={nodeTransform} />
        </div>
      </motion.div>

      {/* Legend (Flat Screen UI) */}
      <div className="absolute bottom-3 left-3 flex gap-3 rounded-full border border-border bg-background/80 px-4 py-2 shadow-xl backdrop-blur-md">
        {(['safe', 'warn', 'critical'] as const).map((s) => (
          <span key={s} className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: statusColor[s], boxShadow: `0 0 10px ${statusColor[s]}` }} />
            {s === 'safe' ? 'Safe' : s === 'warn' ? 'Warning' : 'Emergency'}
          </span>
        ))}
      </div>
    </div>
  )
}
