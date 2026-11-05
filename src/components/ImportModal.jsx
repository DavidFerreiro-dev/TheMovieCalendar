import { useState } from 'react'
import { Check, Upload, X } from 'lucide-react'
import { inspectLetterboxd } from '../lib/letterboxd'

export default function ImportModal({ state, dispatch, onClose }) {
  const [preview, setPreview] = useState(null); const [busy, setBusy] = useState(false); const [progress, setProgress] = useState(0); const [error, setError] = useState('')
  const choose = async (event) => {
    const file = event.target.files[0]; if (!file) return
    setBusy(true); setError('')
    try { setPreview(await inspectLetterboxd(file, (done, total) => setProgress(Math.round(done / total * 100)))) }
    catch (e) { setError(e.message); setPreview(null) }
    setBusy(false)
  }
  const confirm = () => {
    const existing = new Set(Object.values(state.days).flatMap((day) => day.movies.map((m) => m.id)))
    preview.records.forEach((movie) => {
      if (!existing.has(movie.id)) dispatch({ type: 'add', date: movie.letterboxd.date, movie, allowDuplicate: true })
    })
    onClose()
  }
  const dates = preview ? new Set(preview.records.map((m) => m.letterboxd.date)).size : 0
  const range = preview?.records.length ? `${preview.records[0].letterboxd.date} — ${preview.records[preview.records.length - 1].letterboxd.date}` : ''
  return <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="modal import-modal" role="dialog" aria-label="Import from Letterboxd">
      <header className="modal-head"><h2>Import from Letterboxd</h2><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button></header>
      {!preview && <label className="upload-box"><Upload size={30} /><strong>Select diary.csv</strong><small>Letterboxd diary exports are processed locally.</small><input type="file" accept=".csv,text/csv" onChange={choose} /></label>}
      {busy && <p className="msg">Reading and matching titles… {progress}%</p>}
      {error && <p className="msg err">{error}</p>}
      {preview && !busy && <><div className="import-summary"><strong>{preview.records.length}</strong><span>films detected</span><strong>{dates}</strong><span>active dates</span><strong>{preview.records.filter((m) => m.letterboxd.letterboxdRating).length}</strong><span>rated</span><strong>{preview.records.filter((m) => m.letterboxd.rewatch.toLowerCase() === 'yes').length}</strong><span>rewatches</span></div><p className="muted">History: {range}</p><p className="muted">{preview.records.filter((m) => !m.tmdbId).length} titles could not be matched in TMDB. {preview.invalid.length ? `${preview.invalid.length} invalid rows were skipped.` : ''}</p><button className="btn accent wide" onClick={confirm}><Check size={18} /> Import {preview.records.length} films</button></>}
    </div>
  </div>
}
