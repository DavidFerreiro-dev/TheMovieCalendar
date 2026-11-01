import { buildWeeks, coverOf, keyOf, todayKey } from '../lib/store'
import Poster from './Poster'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Calendar({ year, month, days, onOpen }) {
  const today = todayKey()
  const weeks = buildWeeks(year, month)
  // Days from the previous/next month: the date is resolved by overflow
  const lead = weeks[0].filter((d) => d === null).length
  const out = (row, col) => new Date(year, month, row * 7 + col - lead + 1)
  return (
    <div className="cal" key={`${year}-${month}`}>
      {DAYS.map((d) => <div key={d} className="dow">{d}</div>)}
      {weeks.map((wk, row) =>
        wk.map((d, col) => {
          const date = d ? null : out(row, col)
          const key = d ? keyOf(year, month, d) : keyOf(date.getFullYear(), date.getMonth(), date.getDate())
          const day = days[key]
          const cover = coverOf(day)
          const cls = ['cell', !d && 'other', key === today && 'today', day && 'has'].filter(Boolean).join(' ')
          return (
            <button key={key} className={cls} onClick={() => onOpen(key)} aria-label={`${key}${day ? `, ${day.movies.length} ${day.movies.length === 1 ? 'movie' : 'movies'}` : ''}`}>
              {cover && <Poster path={cover.poster} title={cover.title} />}
              <span className="num">{d || date.getDate()}</span>
              {day && day.movies.length > 1 && <span className="count">×{day.movies.length}</span>}
            </button>
          )
        })
      )}
    </div>
  )
}
