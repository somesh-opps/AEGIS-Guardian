// AEGIS Mission Control — dummy data layer.
// Everything here is static/mock and can later be swapped for real API calls.

export type Status = 'safe' | 'warn' | 'critical'

export interface SensorNode {
  id: string
  room: string
  x: number // 0-100 relative position on the floor plan
  y: number
  status: Status
  temperature: number
  smoke: number // ppm
  humidity: number
  motion: boolean
  battery: number
  wifi: number // signal %
  lastUpdated: string
  firmware: string
  signal: number
  lastCalibration: string
  healthScore: number
}

export interface Room {
  id: string
  name: string
  x: number
  y: number
  w: number
  h: number
  kind: 'lab' | 'server' | 'library' | 'hallway' | 'exit' | 'utility'
}

export interface Floor {
  id: string
  name: string
  rooms: Room[]
  nodes: SensorNode[]
}

export interface Building {
  id: string
  name: string
  short: string
  status: Status
  x: number // position on campus map (0-100)
  y: number
  healthScore: number
  occupancy: number
  temperature: number
  airQuality: number // AQI
  power: 'online' | 'backup' | 'offline'
  internet: 'online' | 'degraded' | 'offline'
  cameras: 'online' | 'partial' | 'offline'
  emergency: boolean
  floors: Floor[]
}

function node(partial: Partial<SensorNode> & { id: string; room: string; x: number; y: number }): SensorNode {
  const status = partial.status ?? 'safe'
  return {
    status,
    temperature: 22.4,
    smoke: 2,
    humidity: 41,
    motion: false,
    battery: 92,
    wifi: 98,
    lastUpdated: '2s ago',
    firmware: 'v4.2.1',
    signal: -52,
    lastCalibration: '12 days ago',
    healthScore: 99,
    ...partial,
  }
}

export const buildings: Building[] = [
  {
    id: 'building-a',
    name: 'Academic Block',
    short: 'Academic',
    status: 'warn',
    x: 30,
    y: 38,
    healthScore: 94,
    occupancy: 68,
    temperature: 23.1,
    airQuality: 42,
    power: 'online',
    internet: 'online',
    cameras: 'online',
    emergency: false,
    floors: [
      {
        id: 'a-f1',
        name: 'Floor 1',
        rooms: [
          { id: 'a1-elec', name: 'Electrical Lab', x: 10, y: 10, w: 40, h: 55, kind: 'lab' },
          { id: 'a1-server', name: 'Server Room', x: 50, y: 10, w: 40, h: 55, kind: 'server' },
          { id: 'a1-hall', name: 'Hallway', x: 40, y: 65, w: 30, h: 25, kind: 'hallway' },
          { id: 'a1-stairs', name: 'Staircase', x: 70, y: 65, w: 20, h: 25, kind: 'exit' },
        ],
        nodes: [
          { ...node({ id: 'NODE-A1-01', room: 'Electrical Lab', x: 30, y: 40, status: 'warn', temperature: 38.7, smoke: 34, battery: 76, healthScore: 71 }), motion: true },
          node({ id: 'NODE-A1-02', room: 'Server Room', x: 70, y: 35, temperature: 24.9, humidity: 38 }),
          node({ id: 'NODE-A1-03', room: 'Hallway', x: 55, y: 77, motion: true }),
        ],
      },
      {
        id: 'a-f2',
        name: 'Floor 2',
        rooms: [
          { id: 'a2-class', name: 'Classroom', x: 10, y: 10, w: 40, h: 55, kind: 'library' },
          { id: 'a2-faculty', name: 'Faculty Room', x: 50, y: 10, w: 40, h: 55, kind: 'lab' },
          { id: 'a2-hall', name: 'Hallway', x: 40, y: 65, w: 30, h: 25, kind: 'hallway' },
          { id: 'a2-stairs', name: 'Staircase', x: 70, y: 65, w: 20, h: 25, kind: 'exit' },
        ],
        nodes: [
          node({ id: 'NODE-A2-01', room: 'Classroom', x: 30, y: 40, temperature: 22.1, status: 'safe' }),
          node({ id: 'NODE-A2-02', room: 'Faculty Room', x: 70, y: 35, motion: true }),
        ],
      },
    ],
  },
  {
    id: 'building-b',
    name: 'Research Block',
    short: 'Research',
    status: 'safe',
    x: 62,
    y: 30,
    healthScore: 99,
    occupancy: 41,
    temperature: 21.8,
    airQuality: 28,
    power: 'online',
    internet: 'online',
    cameras: 'online',
    emergency: false,
    floors: [
      {
        id: 'b-f1',
        name: 'Floor 1',
        rooms: [
          { id: 'b1-chem', name: 'Chemistry Lab', x: 10, y: 10, w: 40, h: 55, kind: 'lab' },
          { id: 'b1-control', name: 'Control Room', x: 50, y: 10, w: 40, h: 55, kind: 'server' },
          { id: 'b1-hall', name: 'Hallway', x: 40, y: 65, w: 30, h: 25, kind: 'hallway' },
          { id: 'b1-stairs', name: 'Staircase', x: 70, y: 65, w: 20, h: 25, kind: 'exit' },
        ],
        nodes: [
          node({ id: 'NODE-B1-01', room: 'Chemistry Lab', x: 30, y: 40, motion: true, status: 'safe' }),
          node({ id: 'NODE-B1-02', room: 'Control Room', x: 70, y: 35, temperature: 19.4, humidity: 35 }),
        ],
      },
      {
        id: 'b-f2',
        name: 'Floor 2',
        rooms: [
          { id: 'b2-seminar', name: 'Seminar Hall', x: 10, y: 10, w: 40, h: 55, kind: 'library' },
          { id: 'b2-office', name: 'Office', x: 50, y: 10, w: 40, h: 55, kind: 'server' },
          { id: 'b2-hall', name: 'Hallway', x: 40, y: 65, w: 30, h: 25, kind: 'hallway' },
          { id: 'b2-stairs', name: 'Staircase', x: 70, y: 65, w: 20, h: 25, kind: 'exit' },
        ],
        nodes: [
          node({ id: 'NODE-B2-01', room: 'Seminar Hall', x: 30, y: 40, status: 'warn', motion: true }),
          node({ id: 'NODE-B2-02', room: 'Office', x: 70, y: 35, temperature: 21.3 }),
        ],
      },
    ],
  },
]

export interface CampusFeature {
  id: string
  name: string
  x: number
  y: number
  status: Status
  type: 'building' | 'parking' | 'security'
}

export const campusFeatures: CampusFeature[] = [
  { id: 'building-a', name: 'Academic Block', x: 26, y: 37.5, status: 'warn', type: 'building' },
  { id: 'building-b', name: 'Research Block', x: 74, y: 37.5, status: 'safe', type: 'building' },
]

export interface TimelineEvent {
  time: string
  title: string
  severity: Status
}

export const liveTimeline: TimelineEvent[] = [
  { time: '10:42', title: 'Smoke Detected', severity: 'warn' },
  { time: '10:43', title: 'Temperature Rising', severity: 'warn' },
  { time: '10:43', title: 'Electrical Anomaly', severity: 'critical' },
  { time: '10:44', title: 'Threat Confirmed', severity: 'critical' },
  { time: '10:44', title: 'Emergency Broadcast Sent', severity: 'critical' },
  { time: '10:45', title: 'Building Evacuated', severity: 'safe' },
]

export const aiThinkingStates = [
  'Analyzing Sensor Data...',
  'Cross Validating...',
  'Checking Camera Feed...',
  'Predicting Risk...',
  'Generating Recommendations...',
]

export interface Incident {
  location: string
  severity: string
  confidence: number
  recommendation: string
  spreadTime: string
  exit: string
}

export const aiIncident: Incident = {
  location: 'Building A · Floor 1 · Electrical Lab',
  severity: 'Elevated',
  confidence: 92,
  recommendation: 'Isolate circuit A-12 and pre-stage evacuation via West Exit.',
  spreadTime: '3 min',
  exit: 'West Exit (B)',
}

export interface Notification {
  id: string
  title: string
  detail: string
  time: string
  severity: Status
}

export const notificationSeed: Notification[] = [
  { id: 'n1', title: 'Smoke detected', detail: 'Building A · Electrical Lab', time: 'now', severity: 'warn' },
  { id: 'n2', title: 'Temperature rising', detail: 'NODE-A1-01 · 38.7°C', time: '1m', severity: 'warn' },
  { id: 'n3', title: 'Node offline', detail: 'NODE-A2-04 lost uplink', time: '4m', severity: 'critical' },
  { id: 'n4', title: 'Maintenance completed', detail: 'Building B · Data Center', time: '22m', severity: 'safe' },
  { id: 'n5', title: 'Firmware updated', detail: '12 nodes → v4.2.1', time: '1h', severity: 'safe' },
]

export const campusStats = {
  status: 'Healthy',
  healthScore: 98,
  buildingsOnline: 2,
  activeNodes: 26,
  occupancy: 142,
  threats: 'None',
}

// Analytics
export const healthTrend = [92, 94, 91, 95, 97, 96, 98, 97, 99, 98, 96, 98]
export const incidentFrequency = [3, 1, 2, 0, 4, 1, 2, 1, 0, 2, 1, 0]
export const responseTimes = [42, 38, 51, 29, 33, 44, 27]
export const sensorReliability = 99.4
export const highRiskAreas = [
  { area: 'Building A · Electrical Lab', risk: 78 },
  { area: 'Building A · Server Room', risk: 41 },
  { area: 'Building B · Data Center', risk: 33 },
]
export const nodeHealthDistribution = [
  { label: 'Healthy', value: 6, status: 'safe' as Status },
  { label: 'Warning', value: 1, status: 'warn' as Status },
  { label: 'Critical', value: 1, status: 'critical' as Status },
]

// Maintenance nodes (flatten with building info)
export const maintenanceNodes = buildings.flatMap((b) =>
  b.floors.flatMap((f) =>
    f.nodes.map((n) => ({
      id: n.id,
      building: b.name,
      floor: f.name,
      battery: n.battery,
      firmware: n.firmware,
      signal: n.signal,
      lastCalibration: n.lastCalibration,
      healthScore: n.healthScore,
      status: n.status,
    })),
  ),
)

export interface Report {
  id: string
  title: string
  date: string
  cause: string
  areas: string
  summary: string
}

export const reports: Report[] = [
  {
    id: 'INC-2049',
    title: 'Electrical Fire — Building A',
    date: 'Apr 12, 2026',
    cause: 'Overloaded circuit A-12 in Electrical Lab',
    areas: 'Building A · Floor 1',
    summary:
      'Smoke was first detected in Building A. AEGIS correlated a thermal spike with an electrical anomaly and classified a likely electrical fire. Occupants were redirected through Exit B. No casualties detected.',
  },
  {
    id: 'INC-2048',
    title: 'HVAC Failure — Building B',
    date: 'Apr 03, 2026',
    cause: 'Compressor fault in Data Center cooling loop',
    areas: 'Building B · Floor 1',
    summary:
      'Rising humidity in the Data Center triggered a predictive alert. Maintenance restored cooling before any equipment threshold was breached.',
  },
  {
    id: 'INC-2047',
    title: 'Node Uplink Loss — Building A',
    date: 'Mar 28, 2026',
    cause: 'WiFi mesh saturation on Floor 2',
    areas: 'Building A · Floor 2',
    summary:
      'NODE-A2-04 dropped from the mesh for 6 minutes. Automatic failover to the secondary gateway restored telemetry with no data loss.',
  },
]

export const statusColor: Record<Status, string> = {
  safe: 'var(--safe)',
  warn: 'var(--warn)',
  critical: 'var(--critical)',
}
