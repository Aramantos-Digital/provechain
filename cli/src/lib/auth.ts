import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { StoredSession } from './types.js'

const CORE_SUPABASE_URL = 'https://kxhesmrmfawujrwrrres.supabase.co'
const CORE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aGVzbXJtZmF3dWpyd3JycmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc4MzIyMjUsImV4cCI6MjA1MzQwODIyNX0.2PNjBJOXJGUMiP8foWQxZKHAHVNjdlQaBe0K8skVFaY'

const CONFIG_DIR = join(homedir(), '.provechain')
const CREDENTIALS_FILE = join(CONFIG_DIR, 'credentials.json')

function getClient() {
  return createClient(CORE_SUPABASE_URL, CORE_SUPABASE_ANON_KEY)
}

export async function login(email: string, password: string): Promise<StoredSession> {
  const supabase = getClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) throw new Error(error.message)
  if (!data.session || !data.user) throw new Error('Login failed')

  const session: StoredSession = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at || 0,
    user: { id: data.user.id, email: data.user.email || email },
  }

  mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(session, null, 2), { mode: 0o600 })

  return session
}

export function logout(): void {
  if (existsSync(CREDENTIALS_FILE)) {
    unlinkSync(CREDENTIALS_FILE)
  }
}

export function getStoredSession(): StoredSession | null {
  if (!existsSync(CREDENTIALS_FILE)) return null
  try {
    const raw = readFileSync(CREDENTIALS_FILE, 'utf-8')
    return JSON.parse(raw) as StoredSession
  } catch {
    return null
  }
}

export async function refreshSession(): Promise<StoredSession | null> {
  const stored = getStoredSession()
  if (!stored) return null

  const supabase = getClient()
  const { data, error } = await supabase.auth.setSession({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token,
  })

  if (error || !data.session) {
    logout()
    return null
  }

  const session: StoredSession = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at || 0,
    user: stored.user,
  }

  writeFileSync(CREDENTIALS_FILE, JSON.stringify(session, null, 2), { mode: 0o600 })
  return session
}

export async function getValidSession(): Promise<StoredSession | null> {
  const stored = getStoredSession()
  if (!stored) return null

  const now = Math.floor(Date.now() / 1000)
  if (stored.expires_at && stored.expires_at < now + 60) {
    return refreshSession()
  }

  return stored
}
