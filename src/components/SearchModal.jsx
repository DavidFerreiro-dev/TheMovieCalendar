import { useEffect, useRef, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { hasToken, searchMovies } from '../lib/tmdb'
import Poster from './Poster'

export default function SearchModal({ initialDate, days, onAdd, onClose }) {
  const [date, setDate] = useState(initialDate)
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const input = useRef(null)

  useEffect(() => input.current?.focus(), [])

  // Búsqueda con debounce de 400 ms
  useEffect(() => {
    const term = q.trim()
    if (!term) { setResults(null); setError(''); setLoading(false); return }
    if (!hasToken) { setError('Falta el token de TMDB. Configura VITE_TMDB_ACCESS_TOKEN y reinicia la app.'); return }
    setLoading(true); setError('')
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        setResults(await searchMovies(term, ctrl.signal))
        setLoading(false)
      } catch (e) {
        if (e.name === 'AbortError') return
        setError(e instanceof TypeError ? 'No hay conexión con TMDB. Revisa tu internet e inténtalo de nuevo.' : e.message)
        setLoading(false)
      }
    }, 400)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [q])

  const added = new Set((days[date]?.movies || []).map((m) => m.id))

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label="Añadir película">
        <header className="modal-head">
          <h2>Añadir película</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </header>
        <div className="search-row">
          <label className="field grow">
            <Search size={18} />
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca por título" />
          </label>
          <label className="field">
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Día en que la viste" />
          </label>
        </div>
        <div className="results">
          {error && <p className="msg err">{error}</p>}
          {!error && loading && <p className="msg">Buscando…</p>}
          {!error && !loading && results === null && <p className="msg">Escribe el título de la película que viste.</p>}
          {!error && !loading && results?.length === 0 && <p className="msg">Sin resultados para “{q.trim()}”. Prueba con otro título.</p>}
          {!error && results?.map((m) => {
            const done = added.has(m.id)
            return (
              <button key={m.id} className="result" disabled={done} onClick={() => onAdd(date, m)}>
                <Poster path={m.poster} title={m.title} size="w185" />
                <span className="r-info">
                  <strong>{m.title}</strong>
                  <small>{m.year || 'Sin fecha'}{m.original_title !== m.title ? ` · ${m.original_title}` : ''}</small>
                </span>
                {done && <span className="r-done"><Check size={16} /> Añadida</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
