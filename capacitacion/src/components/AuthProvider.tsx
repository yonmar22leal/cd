import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { AuthContext } from '../lib/auth'
import type { Profile } from '../lib/types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile((data as Profile) ?? null)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session?.user.id)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      // Diferimos la consulta para no bloquear el callback de Supabase
      setTimeout(() => loadProfile(newSession?.user.id), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const refreshProfile = useCallback(() => loadProfile(session?.user.id), [loadProfile, session])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
