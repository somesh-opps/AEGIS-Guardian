'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { notificationSeed, type Notification } from '@/lib/data'

export type View =
  | 'campus'
  | 'building'
  | 'mission-control'
  | 'analytics'
  | 'maintenance'
  | 'reports'
  | 'sensors'
  | 'settings'

interface AegisState {
  view: View
  setView: (v: View) => void
  selectedBuilding: string | null
  openBuilding: (id: string) => void
  emergency: boolean
  triggerEmergency: () => void
  clearEmergency: () => void
  voiceOpen: boolean
  setVoiceOpen: (v: boolean) => void
  notifOpen: boolean
  setNotifOpen: (v: boolean) => void
  searchOpen: boolean
  setSearchOpen: (v: boolean) => void
  profileOpen: boolean
  setProfileOpen: (v: boolean) => void
  notifications: Notification[]
  dismissNotification: (id: string) => void
  unread: number
}

const AegisContext = createContext<AegisState | null>(null)

export function AegisProvider({ children }: { children: ReactNode }) {
  const [view, setViewState] = useState<View>('campus')
  const [selectedBuilding, setSelectedBuildingState] = useState<string | null>('building-a')
  const [emergency, setEmergency] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(notificationSeed)

  // Hydrate view from URL hash and building from localStorage
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '') as View
      if (hash && ['campus', 'building', 'mission-control', 'analytics', 'maintenance', 'reports', 'sensors', 'settings'].includes(hash)) {
        setViewState(hash)
      }
    }
    handleHash()
    window.addEventListener('hashchange', handleHash)
    
    const savedBuilding = localStorage.getItem('aegis_building')
    if (savedBuilding) setSelectedBuildingState(savedBuilding)
    
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  const setView = useCallback((v: View) => {
    setViewState(v)
    window.location.hash = v
  }, [])

  const openBuilding = useCallback((id: string) => {
    setSelectedBuildingState(id)
    localStorage.setItem('aegis_building', id)
    setView('building')
  }, [setView])

  const triggerEmergency = useCallback(() => {
    setEmergency(true)
    setSelectedBuildingState('building-a')
    localStorage.setItem('aegis_building', 'building-a')
  }, [])

  const clearEmergency = useCallback(() => setEmergency(false), [])

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const value = useMemo<AegisState>(
    () => ({
      view,
      setView,
      selectedBuilding,
      openBuilding,
      emergency,
      triggerEmergency,
      clearEmergency,
      voiceOpen,
      setVoiceOpen,
      notifOpen,
      setNotifOpen,
      searchOpen,
      setSearchOpen,
      profileOpen,
      setProfileOpen,
      notifications,
      dismissNotification,
      unread: notifications.filter((n) => n.severity !== 'safe').length,
    }),
    [view, selectedBuilding, openBuilding, emergency, triggerEmergency, clearEmergency, voiceOpen, notifOpen, searchOpen, profileOpen, notifications, dismissNotification],
  )

  return <AegisContext.Provider value={value}>{children}</AegisContext.Provider>
}

export function useAegis() {
  const ctx = useContext(AegisContext)
  if (!ctx) throw new Error('useAegis must be used within AegisProvider')
  return ctx
}
