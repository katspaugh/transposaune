import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

interface Settings {
  lastOpenDirectory: string
  lastTransposePreset: string
  lastCustomSemitones: number
  windowBounds: {
    width: number
    height: number
    x?: number
    y?: number
  }
}

const defaults: Settings = {
  lastOpenDirectory: '',
  lastTransposePreset: 'concert',
  lastCustomSemitones: 0,
  windowBounds: {
    width: 1200,
    height: 800
  }
}

function getSettingsPath(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, 'settings.json')
}

function loadSettings(): Settings {
  const settingsPath = getSettingsPath()

  if (!existsSync(settingsPath)) {
    return { ...defaults }
  }

  try {
    const data = readFileSync(settingsPath, 'utf-8')
    const parsed = JSON.parse(data)
    return { ...defaults, ...parsed }
  } catch {
    return { ...defaults }
  }
}

function saveSettings(data: Settings): void {
  const settingsPath = getSettingsPath()
  const dir = dirname(settingsPath)

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  writeFileSync(settingsPath, JSON.stringify(data, null, 2))
}

// In-memory cache
let settingsCache: Settings | null = null

export const settings = {
  get<K extends keyof Settings>(key: K): Settings[K] {
    if (!settingsCache) {
      settingsCache = loadSettings()
    }
    return settingsCache[key]
  },

  set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    if (!settingsCache) {
      settingsCache = loadSettings()
    }
    settingsCache[key] = value
    saveSettings(settingsCache)
  }
}

export function getSettings(): Settings {
  if (!settingsCache) {
    settingsCache = loadSettings()
  }
  return { ...settingsCache }
}

export function updateSettings(updates: Partial<Settings>): void {
  if (!settingsCache) {
    settingsCache = loadSettings()
  }
  Object.assign(settingsCache, updates)
  saveSettings(settingsCache)
}
