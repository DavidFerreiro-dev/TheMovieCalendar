import { useState } from 'react'
import { Download, X } from 'lucide-react'
import { FORMATS, downloadCalendar } from '../lib/exportImage'

export default function ExportModal({ state, year, month, onClose }) {
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const go = async (f) => {
    setBusy(f); setErr('')
    try { await downloadCalendar(state, year, month, f) }
    catch { setErr('No se pudo generar la imagen. Inténtalo de nuevo.') }
    setBusy('')
  }
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal small" role="dialog" aria-label="Exportar calendario">
        <header className="modal-head">
          <h2>Exportar como JPG</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </header>
        <div className="formats">
          {Object.entries(FORMATS).map(([k, f]) => (
            <button key={k} className="format" disabled={!!busy} onClick={() => go(k)}>
              <span className={`shape ${k}`} />
              <span className="r-info"><strong>{f.label}</strong><small>{f.hint}</small></span>
              <span className="r-done">{busy === k ? 'Generando…' : <Download size={18} />}</span>
            </button>
          ))}
        </div>
        {err && <p className="msg err">{err}</p>}
      </div>
    </div>
  )
}
