"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Mic, X } from "lucide-react"
import { useAegis } from "../store"

const SCRIPT = [
  { role: "user", text: "AEGIS, what's the status of the campus?" },
  {
    role: "aegis",
    text: "All 6 buildings are online. Energy load is nominal at 68%. One warning: Innovation Hub HVAC zone 3 is running warm.",
  },
  { role: "user", text: "Optimize energy across the campus." },
  {
    role: "aegis",
    text: "Dimming non-critical lighting and shifting HVAC setpoints. Projected saving: 14% over the next 4 hours.",
  },
]

export function VoiceAssistant() {
  const { voiceOpen, setVoiceOpen } = useAegis()
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!voiceOpen) {
      setStep(0)
      return
    }
    const timers = SCRIPT.map((_, i) => setTimeout(() => setStep(i + 1), 1200 * (i + 1)))
    return () => timers.forEach(clearTimeout)
  }, [voiceOpen])

  return (
    <AnimatePresence>
      {voiceOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-background/80 backdrop-blur-2xl"
        >
          <button
            onClick={() => setVoiceOpen(false)}
            className="absolute right-6 top-6 flex size-10 items-center justify-center rounded-full glass text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close voice assistant"
          >
            <X className="size-5" />
          </button>

          <div className="relative flex size-40 items-center justify-center">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute inset-0 rounded-full border border-primary/40"
                animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, delay: i * 0.8, ease: "easeOut" }}
              />
            ))}
            <motion.div
              className="flex size-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_60px_-5px_var(--primary)]"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              <Mic className="size-9" />
            </motion.div>
          </div>

          <p className="mt-8 font-mono text-xs uppercase tracking-[0.3em] text-primary">Listening</p>

          <div className="mt-8 flex w-full max-w-lg flex-col gap-3 px-6">
            {SCRIPT.slice(0, step).map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  line.role === "user"
                    ? "self-end bg-primary/15 text-foreground"
                    : "self-start glass text-muted-foreground"
                }`}
              >
                {line.role === "aegis" && (
                  <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-primary">AEGIS</span>
                )}
                {line.text}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
