'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useMotionTemplate } from 'motion/react'
import { Thermometer, Droplets, Wind, Activity, BatteryMedium, Wifi, Clock } from 'lucide-react'
import type { Floor, SensorNode } from '@/lib/data'
import { statusColor } from '@/lib/data'

const roomTint: Record<string, string> = {
  lab: 'var(--purple)',
  server: 'var(--blue)',
  library: 'var(--cyan)',
  hallway: 'var(--muted-foreground)',
  exit: 'var(--safe)',
  utility: 'var(--warn)',
}

export function FloorPlan({ floor }: { floor: Floor }) {
  const [active, setActive] = useState<SensorNode | null>(null)

  const rotateX = useMotionValue(55)
  const rotateZ = useMotionValue(-45)
  const invRotateX = useTransform(rotateX, x => -x)
  const invRotateZ = useTransform(rotateZ, z => -z)
  const popupTransform = useMotionTemplate`rotateZ(${invRotateZ}deg) rotateX(${invRotateX}deg) translateZ(60px)`

  return (
    <div className="flex w-full items-center justify-center py-12 overflow-hidden" style={{ perspective: '1200px' }}>
      <motion.div 
        className="aegis-grid relative aspect-square w-full max-w-2xl rounded-2xl border border-primary/20 bg-background/40 shadow-2xl cursor-grab active:cursor-grabbing"
        style={{
          rotateX,
          rotateZ,
          transformStyle: 'preserve-3d',
          boxShadow: '-15px 25px 45px rgba(0,0,0,0.7), inset 0 0 40px rgba(0,0,0, 0.5)',
          touchAction: 'none'
        }}
        onPan={(e, info) => {
          rotateZ.set(rotateZ.get() + info.delta.x * 0.4)
          let newX = rotateX.get() - info.delta.y * 0.4
          newX = Math.max(0, Math.min(85, newX))
          rotateX.set(newX)
        }}
      >
        {/* 3D Extruded Rooms */}
        <div className="absolute inset-0 h-full w-full" style={{ transformStyle: 'preserve-3d' }}>
          {floor.rooms.map((r) => {
            const tint = roomTint[r.kind]
            return (
              <div
                key={r.id}
                className="absolute"
                style={{
                  left: `${r.x}%`,
                  top: `${r.y}%`,
                  width: `${r.w}%`,
                  height: `${r.h}%`,
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Base Shadow */}
                <div 
                  className="absolute inset-0"
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    transform: 'translateZ(-2px)',
                    filter: 'blur(4px)'
                  }}
                />
                
                {r.kind === 'exit' ? (
                  <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
                    {/* Steps ascending Right to Left */}
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={`step-${i}`} className="absolute h-full" style={{ left: `${(9 - i) * 10}%`, width: '10.5%', transformStyle: 'preserve-3d' }}>
                        {/* Tread */}
                        <motion.div 
                          className="absolute inset-0"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${tint} 50%, transparent)`,
                            border: `1px solid color-mix(in srgb, ${tint} 90%, transparent)`,
                          }}
                          initial={{ z: 0 }}
                          animate={{ z: (i + 1) * 9 }}
                          transition={{ duration: 1.2, delay: 0.1 + i * 0.05, ease: "easeOut" }}
                        />
                        {/* Riser (East-facing) */}
                        <motion.div 
                          className="absolute top-0 right-0 h-full origin-right"
                          style={{
                            width: '9.5px',
                            backgroundColor: `color-mix(in srgb, ${tint} 30%, transparent)`,
                          }}
                          initial={{ z: 0, rotateY: 90 }}
                          animate={{ z: i * 9, rotateY: 90 }}
                          transition={{ duration: 1.2, delay: 0.1 + i * 0.05, ease: "easeOut" }}
                        />
                        {/* South Side Profile of Step */}
                        <motion.div 
                          className="absolute bottom-0 left-0 w-full origin-bottom"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${tint} 40%, transparent)`,
                            borderRight: `1px solid color-mix(in srgb, ${tint} 70%, transparent)`,
                            borderTop: `1px solid color-mix(in srgb, ${tint} 70%, transparent)`,
                          }}
                          initial={{ height: 0, rotateX: -90 }}
                          animate={{ height: (i + 1) * 9, rotateX: -90 }}
                          transition={{ duration: 1.2, delay: 0.1 + i * 0.05, ease: "easeOut" }}
                        />
                      </div>
                    ))}
                    {/* Outer Back/Side Walls for Staircase Room */}
                    <motion.div className="absolute top-0 left-0 w-full origin-top" style={{ backgroundColor: `color-mix(in srgb, ${tint} 15%, transparent)` }} initial={{ height: 0, rotateX: 90 }} animate={{ height: 90, rotateX: 90 }} transition={{ duration: 1.2, delay: 0.1, ease: "easeOut" }} />
                    <motion.div className="absolute top-0 right-0 h-full origin-right" style={{ backgroundColor: `color-mix(in srgb, ${tint} 20%, transparent)` }} initial={{ width: 0, rotateY: 90 }} animate={{ width: 90, rotateY: 90 }} transition={{ duration: 1.2, delay: 0.1, ease: "easeOut" }} />
                  </div>
                ) : (
                  <>
                    {/* Floor Slabs */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${tint} 20%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${tint} 50%, transparent)`,
                      }}
                    />

                    {/* North Wall (Back) */}
                    <motion.div 
                      className="absolute top-0 left-0 w-full origin-top"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${tint} 15%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${tint} 40%, transparent)`,
                      }}
                      initial={{ height: 0, rotateX: 90 }}
                      animate={{ height: 90, rotateX: 90 }}
                      transition={{ duration: 1.2, delay: 0.1, ease: "easeOut" }}
                    />
                    {/* East Wall (Right) */}
                    <motion.div 
                      className="absolute top-0 right-0 h-full origin-right"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${tint} 20%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${tint} 50%, transparent)`,
                      }}
                      initial={{ width: 0, rotateY: 90 }}
                      animate={{ width: 90, rotateY: 90 }}
                      transition={{ duration: 1.2, delay: 0.1, ease: "easeOut" }}
                    />
                    {/* South Wall (Front - Facing Camera) */}
                    <motion.div 
                      className="absolute bottom-0 left-0 w-full origin-bottom"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${tint} 30%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${tint} 70%, transparent)`,
                      }}
                      initial={{ height: 0, rotateX: -90 }}
                      animate={{ height: 90, rotateX: -90 }}
                      transition={{ duration: 1.2, delay: 0.1, ease: "easeOut" }}
                    />
                    {/* West Wall (Left - Facing Camera) */}
                    <motion.div 
                      className="absolute top-0 left-0 h-full origin-left"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${tint} 40%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${tint} 80%, transparent)`,
                      }}
                      initial={{ width: 0, rotateY: -90 }}
                      animate={{ width: 90, rotateY: -90 }}
                      transition={{ duration: 1.2, delay: 0.1, ease: "easeOut" }}
                    />
                    
                    {/* Ceiling / Glass Roof */}
                    <motion.div 
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${tint} 8%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${tint} 30%, transparent)`,
                      }}
                      initial={{ z: 0 }}
                      animate={{ z: 90 }}
                      transition={{ duration: 1.2, delay: 0.1, ease: "easeOut" }}
                    />
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Room labels (HTML for crisp text) */}
        {floor.rooms.map((r) => (
          <motion.span
            key={`${r.id}-label`}
            className="pointer-events-none absolute font-mono text-xs font-bold uppercase tracking-widest text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
            style={{ 
              left: `${r.x + 3}%`, 
              top: `${r.y + 4}%`,
              textShadow: '0 0 10px rgba(255,255,255,0.3)'
            }}
            initial={{ z: 0, opacity: 0 }}
            animate={{ z: 100, opacity: 1 }}
            transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
          >
            {r.name}
          </motion.span>
        ))}

        {/* Sensor nodes */}
        {floor.nodes.map((n) => {
          const color = statusColor[n.status]
          return (
            <motion.button
              key={n.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-300 hover:scale-125 hover:-translate-y-3"
              style={{ 
                left: `${n.x}%`, 
                top: `${n.y}%`,
              }}
              initial={{ z: 0, opacity: 0 }}
              animate={{ z: 45, opacity: 1 }}
              transition={{ duration: 1, delay: 1.2, ease: "backOut" }}
              onMouseEnter={() => setActive(n)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive((p) => (p?.id === n.id ? null : n))}
              aria-label={`Sensor ${n.id}`}
            >
              <span className="relative flex items-center justify-center">
                <motion.span
                  className="absolute rounded-full"
                  style={{ backgroundColor: color, width: 32, height: 32, opacity: 0.2 }}
                  animate={{ scale: n.status === 'safe' ? [1, 1.6, 1] : [1, 2, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: n.status === 'critical' ? 1 : 2.2, repeat: Infinity }}
                />
                <span
                  className="relative size-4 rounded-full border border-white/20"
                  style={{ backgroundColor: color, boxShadow: `0 0 20px ${color}, 0 0 40px ${color}` }}
                />
                <div 
                  className="absolute h-12 w-px origin-bottom bg-gradient-to-t from-transparent to-current opacity-50"
                  style={{ color, bottom: '50%' }}
                />
              </span>
            </motion.button>
          )
        })}

        {/* Node popup */}
        <AnimatePresence>
          {active && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, z: 0 }}
              animate={{ opacity: 1, scale: 1, z: 40 }}
              exit={{ opacity: 0, scale: 0.8, z: 0 }}
              transition={{ duration: 0.2 }}
              className="glass pointer-events-none absolute w-56 rounded-xl border border-white/10 bg-background/80 p-4 shadow-2xl backdrop-blur-xl"
              style={{
                left: `${Math.min(active.x + 2, 50)}%`,
                top: `${Math.min(active.y + 2, 50)}%`,
                transform: popupTransform, // Dynamically counter-rotates to face camera
                transformOrigin: 'top left',
              }}
            >
              <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-2">
                <span className="font-mono text-sm font-bold tracking-tight">{active.id}</span>
                <span className="size-2.5 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: statusColor[active.status], color: statusColor[active.status] }} />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <PopRow icon={Thermometer} label="Temp" value={`${active.temperature}°C`} />
                <PopRow icon={Wind} label="Smoke" value={`${active.smoke}ppm`} />
                <PopRow icon={Droplets} label="Humid" value={`${active.humidity}%`} />
                <PopRow icon={Activity} label="Motion" value={active.motion ? 'Yes' : 'No'} />
                <PopRow icon={BatteryMedium} label="Batt" value={`${active.battery}%`} />
                <PopRow icon={Wifi} label="WiFi" value={`${active.wifi}%`} />
              </div>
              <div className="mt-3 flex items-center gap-1.5 rounded-md bg-secondary/30 px-2 py-1 text-[10px] text-muted-foreground">
                <Clock className="size-3" /> Updated {active.lastUpdated}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

function PopRow({ icon: Icon, label, value }: { icon: typeof Thermometer; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="size-3 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-medium">{value}</span>
    </div>
  )
}
