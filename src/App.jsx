import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Upload } from 'lucide-react'
import { monthName, todayKey, useDiary } from './lib/store'
import Calendar from './components/Calendar'
import DayPanel from './components/DayPanel'
import SearchModal from './components/SearchModal'
import ExportMenu from './components/ExportMenu'
import ImportModal from './components/ImportModal'

export default function App() {
  const [state, dispatch] = useDiary()
  const now = new Date()
  const [view, setView] = useState(state.view || { y: now.getFullYear(), m: now.getMonth() })
  const [openDay, setOpenDay] = useState(null)
  const [search, setSearch] = useState(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => { dispatch({ type: 'view', view }) }, [view, dispatch])
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') { search ? setSearch(null) : importing ? setImporting(false) : setOpenDay(null) } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [search, importing])

  const go = (d) => setView(({ y, m }) => { const t = new Date(y, m + d, 1); return { y: t.getFullYear(), m: t.getMonth() } })
  const isCurrent = view.y === now.getFullYear() && view.m === now.getMonth()

  return (
    <div className="app">
      <header className="top">
        <div className="heading">
          <h1 className="title">
            <span className="mname">{monthName(view.y, view.m)}</span>
            <span className="year">{view.y}</span>
          </h1>
          <div className="calendar-nav">
            <button className="icon-btn" onClick={() => go(-1)} aria-label="Previous month"><ChevronLeft size={22} /></button>
            <button className="btn" onClick={() => setView({ y: now.getFullYear(), m: now.getMonth() })} disabled={isCurrent}>Today</button>
            <button className="icon-btn" onClick={() => go(1)} aria-label="Next month"><ChevronRight size={22} /></button>
          </div>
        </div>
        <nav className="tools">
          <div className="action-nav">
          <button className="btn" onClick={() => setImporting(true)}><Upload size={17} /><span className="lbl">Import from Letterboxd</span></button>
          <ExportMenu state={state} date={openDay || todayKey()} monthDate={`${view.y}-${String(view.m + 1).padStart(2, '0')}-01`} />
          <button className="btn accent" onClick={() => setSearch(isCurrent ? todayKey() : `${view.y}-${String(view.m + 1).padStart(2, '0')}-01`)}><Plus size={18} /><span className="lbl">Add</span></button>
          </div>
        </nav>
      </header>

      <Calendar year={view.y} month={view.m} days={state.days} onOpen={setOpenDay} />

      {openDay && (
        <DayPanel date={openDay} day={state.days[openDay]} dispatch={dispatch} onClose={() => setOpenDay(null)} onAdd={() => setSearch(openDay)} />
      )}
      {search && (
        <SearchModal initialDate={search} days={state.days} onClose={() => setSearch(null)} onAdd={(date, movie) => dispatch({ type: 'add', date, movie })} />
      )}
      {importing && <ImportModal state={state} dispatch={dispatch} onClose={() => setImporting(false)} />}
    </div>
  )
}
