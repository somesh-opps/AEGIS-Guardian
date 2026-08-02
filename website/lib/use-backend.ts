'use client'

// AEGIS Mission Control — React hooks that bridge lib/api.ts with components.
// All hooks fall back gracefully to static data when the backend is unreachable.

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  fetchHomeData,
  fetchLiveData,
  fetchBuildingData,
  fetchSosData,
  fetchCampusData,
  fetchNodes,
  fetchAnalytics,
  fetchReports,
  fetchLiveFeed,
  fetchBuildingStats,
  sendChatMessage,
} from './api'

// ─── useBackendData ────────────────────────────────────────────────────────
// Generic polling hook – fetches `fn` every `intervalMs` and exposes the
// raw `data` along with `loading` and `error` state.

export function useBackendData<T>(
  fn: () => Promise<{ success: boolean; data?: T }>,
  intervalMs = 10_000,
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fnRef.current()
        if (!cancelled && res.success && res.data != null) {
          setData(res.data)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const id = setInterval(load, intervalMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [intervalMs])

  return { data, loading, error }
}

// ─── Convenience hooks ────────────────────────────────────────────────────

export function useHomeData() {
  return useBackendData(fetchHomeData, 30_000)
}

export function useLiveData() {
  return useBackendData(fetchLiveData, 5_000)
}

export function useBuildingData() {
  return useBackendData(fetchBuildingData, 20_000)
}

export function useSosData() {
  return useBackendData(fetchSosData, 15_000)
}

export function useCampusData() {
  return useBackendData(fetchCampusData, 15_000)
}

export function useNodes() {
  return useBackendData(fetchNodes, 8_000)
}

export function useAnalytics() {
  return useBackendData(fetchAnalytics, 30_000)
}

export function useReports() {
  return useBackendData(fetchReports, 60_000)
}

export function useLiveFeed() {
  return useBackendData(fetchLiveFeed, 5_000)
}

export function useBuildingStats(buildingId: string | null) {
  const [data, setData] = useState<import('./api').BuildingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!buildingId) { setLoading(false); return }
    let cancelled = false
    setData(null)
    setLoading(true)

    async function load() {
      try {
        const res = await fetchBuildingStats(buildingId!)
        if (!cancelled) {
          setData(res.success && res.data ? res.data : null)
          setError(res.success ? null : (res.error ?? 'Unknown error'))
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const id = setInterval(load, 10_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [buildingId])

  return { data, loading, error }
}

// ─── useBackendStatus ─────────────────────────────────────────────────────
// Lightweight health-check: returns true when backend is reachable.

export function useBackendStatus() {
  const [online, setOnline] = useState<boolean | null>(null)

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch(
          (process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:5000') + '/',
        )
        setOnline(res.ok)
      } catch {
        setOnline(false)
      }
    }
    check()
    const id = setInterval(check, 30_000)
    return () => clearInterval(id)
  }, [])

  return online
}

// ─── useAiChat ────────────────────────────────────────────────────────────
// Manages conversation history + streaming-style loading state for the AI
// Commander chat panel in the Mission Control view.

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  provider?: string
  error?: boolean
}

export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'AEGIS AI Commander online. Ask me about sensor data, incidents, or evacuation recommendations.',
    },
  ])
  const [thinking, setThinking] = useState(false)

  const send = useCallback(async (text: string) => {
    if (!text.trim() || thinking) return

    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setThinking(true)

    try {
      const res = await sendChatMessage(text)
      setMessages((prev) => [
        ...prev,
        res.success && res.reply
          ? { role: 'assistant', content: res.reply, provider: res.provider }
          : { role: 'assistant', content: res.error ?? 'No response from AI.', error: true },
      ])
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Connection error: ${(e as Error).message}`, error: true },
      ])
    } finally {
      setThinking(false)
    }
  }, [thinking])

  return { messages, thinking, send }
}
