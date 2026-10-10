import { useCallback, useEffect, useRef, useState } from 'react'

/** Ejecuta una función asíncrona y expone { data, loading, error, reload }. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Guardamos siempre la última versión de la función sin re-disparar efectos
  const fnRef = useRef(fn)
  useEffect(() => {
    fnRef.current = fn
  })
  const key = JSON.stringify(deps)

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await fnRef.current())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload()
  }, [reload, key])

  return { data, loading, error, reload, setData }
}
