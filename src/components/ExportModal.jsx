import { useState } from 'react'
import { Download, X } from 'lucide-react'
import { FORMATS, downloadCalendar } from '../lib/exportImage'
import { downloadHistoryPdf } from '../lib/exportPdf'

export default function ExportModal({ state, year, month, onClose }) {
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [pdfProgress, setPdfProgress] = useState(0)
  const go = async (f) => {
    setBusy(f); setErr('')
    try { await downloadCalendar(state, year, month, f) }
    catch { setErr('Could not generate the image. Please try again.') }
    setBusy('')
  }
  const goPdf = async () => {
    setBusy('pdf'); setErr('')
    try { await downloadHistoryPdf(state, (done, total) => setPdfProgress(Math.round(done / total * 100))) }
    catch (e) { setErr(e.message) }
    setBusy('')
  }
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal small" role="dialog" aria-label="Export calendar">
        <header className="modal-head">
          <h2>Export history</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </header>
        <button className="format" disabled={!!busy} onClick={goPdf}>
          <span className="shape horizontal" />
          <span className="r-info"><strong>Export history as PDF</strong><small>Complete cinematic journey · {busy === 'pdf' ? `${pdfProgress}%` : 'all months'}</small></span>
          <span className="r-done">{busy === 'pdf' ? 'Generating…' : <Download size={18} />}</span>
        </button>
        <h3 className="export-divider">Export current month as image</h3>
        <div className="formats">
          {Object.entries(FORMATS).map(([k, f]) => (
            <button key={k} className="format" disabled={!!busy} onClick={() => go(k)}>
              <span className={`shape ${k}`} />
              <span className="r-info"><strong>{f.label}</strong><small>{f.hint}</small></span>
              <span className="r-done">{busy === k ? 'Generating…' : <Download size={18} />}</span>
            </button>
          ))}
        </div>
        {err && <p className="msg err">{err}</p>}
      </div>
    </div>
  )
}
