import { useEffect, useRef, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { hasToken, searchMovies, searchSeries } from '../lib/tmdb'
import Poster from './Poster'

const TABS = [
  { key: 'movie', label: 'Movies' },
  { key: 'tv',    label: 'Series' },
]

export default function SearchModal({ initialDate, days, onAdd, onClose }) {
  const [date, setDate] = useState(initialDate)
  const [tab, setTab] = useState('movie')
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const input = useRef(null)

  useEffect(() => input.current?.focus(), [])

  // Re-search when query or tab changes (400 ms debounce)
  useEffect(() => {
    const term = q.trim()
    if (!term) { setResults(null); setError(''); setLoading(false); return }
    if (!hasToken) { setError('TMDB token missing. Set VITE_TMDB_ACCESS_TOKEN and restart the app.'); return }
    setLoading(true); setError('')
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const fn = tab === 'tv' ? searchSeries : searchMovies
        setResults(await fn(term, ctrl.signal))
        setLoading(false)
      } catch (e) {
        if (e.name === 'AbortError') return
        setError(e instanceof TypeError ? 'No connection to TMDB. Check your internet and try again.' : e.message)
        setLoading(false)
      }
    }, 400)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [q, tab])

  const added = new Set((days[date]?.movies || []).map((m) => m.id))
  const placeholder = tab === 'tv' ? 'Search by title (series)' : 'Search by title (movie)'

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label="Add title">
        <header className="modal-head">
          <h2>Add {tab === 'tv' ? 'series' : 'movie'}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </header>

        {/* Tab toggle */}
        <div className="type-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`type-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => { setTab(t.key); setResults(null) }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="search-row">
          <label className="field grow">
            <Search size={18} />
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} />
          </label>
          <label className="field">
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Day you watched it" />
          </label>
        </div>

        <div className="results">
          {error && <p className="msg err">{error}</p>}
          {!error && loading && <p className="msg">Searching…</p>}
          {!error && !loading && results === null && <p className="msg">Type the title of the {tab === 'tv' ? 'series' : 'movie'} you watched.</p>}
          {!error && !loading && results?.length === 0 && <p className="msg">No results for "{q.trim()}". Try a different title.</p>}
          {!error && results?.map((m) => {
            const done = added.has(m.id)
            return (
              <button key={m.id} className="result" disabled={done} onClick={() => onAdd(date, m)}>
                <Poster path={m.poster} title={m.title} size="w185" />
                <span className="r-info">
                  <strong>{m.title}</strong>
                  <small>
                    {m.year || 'No date'}
                    {m.original_title !== m.title ? ` · ${m.original_title}` : ''}
                    {tab === 'tv' && <span className="badge-tv"> · TV</span>}
                  </small>
                </span>
                {done && <span className="r-done"><Check size={16} /> Added</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
