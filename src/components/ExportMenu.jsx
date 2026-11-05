import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Download, FileText } from 'lucide-react'
import { downloadDay, downloadMonth } from '../lib/exportImage'
import { downloadHistoryPdf } from '../lib/exportPdf'

export default function ExportMenu({ state, date, monthDate }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [scope, setScope] = useState('day')
  const ref = useRef(null)

  useEffect(() => {
    const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const run = async (target, aspect, format) => {
    const type = `${target}-${aspect}-${format}`
    setBusy(type); setError('')
    try {
      if (target === 'all') await downloadHistoryPdf(state)
      else if (target === 'day') await downloadDay(state, date, aspect, format)
      else {
        const month = new Date(`${monthDate}T12:00:00`)
        await downloadMonth(state, month.getFullYear(), month.getMonth(), aspect, format)
      }
      setOpen(false)
    } catch (e) { setError(e.message) }
    setBusy('')
  }

  return <div className="export-menu" ref={ref}>
    <button className="btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <Download size={17} /> <span className="lbl">Export</span><ChevronDown size={15} />
    </button>
    {open && <div className="export-dropdown" role="menu">
      <div className="scope-tabs">{['day', 'month', 'all'].map((value) => <button key={value} className={scope === value ? 'active' : ''} onClick={() => { setScope(value); setError('') }}>{value === 'all' ? 'All' : value[0].toUpperCase() + value.slice(1)}</button>)}</div>
      {scope !== 'all' && <><p className="menu-label">{scope === 'day' ? `Day · ${date}` : `Month · ${monthDate.slice(0, 7)}`}</p><p className="menu-section">Aspect ratio and image format</p>
        <div className="format-grid">{(scope === 'day' ? [['square', '1:1'], ['vertical', '9:16'], ['horizontal', '16:9']] : [['vertical', '9:16'], ['horizontal', '16:9']]).map(([aspect, label]) => <div key={aspect} className="format-choice"><strong>{label}</strong><button aria-label={`Export ${scope} ${label} as JPG`} onClick={() => run(scope, aspect, 'jpg')} disabled={!!busy}>{busy === `${scope}-${aspect}-jpg` ? '…' : 'JPG'}</button><button aria-label={`Export ${scope} ${label} as PNG`} onClick={() => run(scope, aspect, 'png')} disabled={!!busy}>{busy === `${scope}-${aspect}-png` ? '…' : 'PNG'}</button></div>)}</div></>}
      {scope === 'all' && <button className="menu-item" onClick={() => run('all', null, 'pdf')} disabled={!!busy}><FileText size={17} /><span><strong>PDF history</strong><small>Complete cinematic journey</small></span><em>{busy ? 'Generating…' : <Download size={16} />}</em></button>}
      {error && <p className="menu-error">{error}</p>}
    </div>}
  </div>
}
