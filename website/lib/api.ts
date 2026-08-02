// AEGIS Mission Control — Backend API client.
// Points to the Flask server running at http://localhost:5000

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:5000'

// ─── Generic fetch helper ──────────────────────────────────────────────────
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

// ─── Response shapes ───────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface ChatResponse {
  success: boolean
  reply?: string
  provider?: string
  error?: string
}

// ─── Campus stats ──────────────────────────────────────────────────────────
export interface CampusData {
  status: string
  healthScore: number
  buildingsOnline: number
  activeNodes: number
  occupancy: number
  threats: string
}

/** GET /api/campus */
export function fetchCampusData(): Promise<ApiResponse<CampusData>> {
  return apiFetch<ApiResponse<CampusData>>('/api/campus')
}

// ─── Sensor nodes ──────────────────────────────────────────────────────────
export interface NodeData {
  id: string
  building: string
  floor: string
  room: string
  status: 'safe' | 'warn' | 'critical'
  temperature?: number
  smoke?: number
  humidity?: number
  gas?: number
  current?: number
  flame?: boolean
  panic?: boolean
  motion?: boolean
  battery?: number
  wifi?: number
  signal?: number
  firmware?: string
  lastCalibration?: string
  healthScore?: number
  lastUpdated?: string
}

/** GET /api/nodes */
export function fetchNodes(): Promise<ApiResponse<NodeData[]>> {
  return apiFetch<ApiResponse<NodeData[]>>('/api/nodes')
}

// ─── Analytics ─────────────────────────────────────────────────────────────
export interface HighRiskArea {
  area: string
  risk: number
}

export interface NodeHealthItem {
  label: string
  value: number
  status: 'safe' | 'warn' | 'critical'
}

export interface AnalyticsData {
  healthTrend?: number[]
  incidentFrequency?: number[]
  responseTimes?: number[]
  sensorReliability?: number
  highRiskAreas?: HighRiskArea[]
  nodeHealthDistribution?: NodeHealthItem[]
}

/** GET /api/analytics */
export function fetchAnalytics(): Promise<ApiResponse<AnalyticsData>> {
  return apiFetch<ApiResponse<AnalyticsData>>('/api/analytics')
}

// ─── Reports ───────────────────────────────────────────────────────────────
export interface TimelineEvent {
  time: string
  title: string
  severity: 'safe' | 'warn' | 'critical'
}

export interface ReportData {
  id: string
  title: string
  date: string
  cause: string
  areas: string
  summary: string
  timeline?: TimelineEvent[]
}

/** GET /api/reports */
export function fetchReports(): Promise<ApiResponse<ReportData[]>> {
  return apiFetch<ApiResponse<ReportData[]>>('/api/reports')
}

// ─── Live feed ─────────────────────────────────────────────────────────────
export interface LiveFeedEvent {
  message: string
  timestamp: string
}

/** GET /api/live-feed */
export function fetchLiveFeed(): Promise<ApiResponse<LiveFeedEvent[]>> {
  return apiFetch<ApiResponse<LiveFeedEvent[]>>('/api/live-feed')
}

// ─── Existing endpoints ────────────────────────────────────────────────────

/** GET /api/home — overall campus health snapshot */
export function fetchHomeData<T = Record<string, unknown>>(): Promise<ApiResponse<T>> {
  return apiFetch<ApiResponse<T>>('/api/home')
}

/** GET /api/live — real-time sensor/event stream snapshot */
export function fetchLiveData<T = Record<string, unknown>>(): Promise<ApiResponse<T>> {
  return apiFetch<ApiResponse<T>>('/api/live')
}

/** GET /api/building — building + floor + node data */
export function fetchBuildingData<T = Record<string, unknown>>(): Promise<ApiResponse<T>> {
  return apiFetch<ApiResponse<T>>('/api/building')
}

/** GET /api/sos — SOS / emergency data */
export function fetchSosData<T = Record<string, unknown>>(): Promise<ApiResponse<T>> {
  return apiFetch<ApiResponse<T>>('/api/sos')
}

/** POST /api/chat — send a message to the AI (Gemini → Groq fallback) */
export function sendChatMessage(message: string): Promise<ChatResponse> {
  return apiFetch<ChatResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

/** GET /api/building-stats/:id — per-building live telemetry */
export interface BuildingStats {
  building_id: string
  status?: 'safe' | 'warn' | 'critical'
  healthScore?: number
  occupancy?: number
  temperature?: number
  airQuality?: number
  power?: 'online' | 'backup' | 'offline'
  internet?: 'online' | 'degraded' | 'offline'
  cameras?: 'online' | 'partial' | 'offline'
  emergency?: boolean
}

export function fetchBuildingStats(buildingId: string): Promise<ApiResponse<BuildingStats>> {
  return apiFetch<ApiResponse<BuildingStats>>(`/api/building-stats/${buildingId}`)
}

/** GET / — health-check */
export function fetchHealth(): Promise<{ success: boolean; service: string; status: string }> {
  return apiFetch('/')
}
