import { useEffect, useReducer } from 'react'

const KEY = 'cine-diario:v1'
const empty = { days: {}, view: null }

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    if (s && s.days) return { ...empty, ...s }
  } catch {}
  return empty
}

function reducer(s, a) {
  const day = s.days[a.date]
  switch (a.type) {
    case 'add': {
      const d = day || { movies: [], cover: null }
      if (!a.allowDuplicate && d.movies.some((m) => m.id === a.movie.id)) return s
      return { ...s, days: { ...s.days, [a.date]: { movies: [...d.movies, a.movie], cover: d.cover ?? a.movie.id } } }
    }
    case 'remove': {
      if (!day) return s
      const movies = day.movies.filter((m) => m.id !== a.id)
      const days = { ...s.days }
      if (!movies.length) delete days[a.date]
      else days[a.date] = { movies, cover: day.cover === a.id ? movies[0].id : day.cover }
      return { ...s, days }
    }
    case 'reorder':
      return day ? { ...s, days: { ...s.days, [a.date]: { ...day, movies: a.movies } } } : s
    case 'cover':
      return day ? { ...s, days: { ...s.days, [a.date]: { ...day, cover: a.id } } } : s
    case 'poster': {
      if (!day) return s
      const movies = day.movies.map((m) => m.id === a.id ? { ...m, poster: a.poster, default_poster: m.default_poster ?? m.poster } : m)
      return { ...s, days: { ...s.days, [a.date]: { ...day, movies } } }
    }
    case 'view':
      return { ...s, view: a.view }
    default:
      return s
  }
}

export function useDiary() {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {}
  }, [state])
  return [state, dispatch]
}

export const coverOf = (day) => day && (day.movies.find((m) => m.id === day.cover) || day.movies[0])
const pad = (n) => String(n).padStart(2, '0')
export const keyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
export const todayKey = () => { const t = new Date(); return keyOf(t.getFullYear(), t.getMonth(), t.getDate()) }
export const monthName = (y, m) => new Date(y, m, 1).toLocaleDateString('en-US', { month: 'long' })

// Weeks from Monday to Sunday; null = padding outside the month
export function buildWeeks(y, m) {
  const lead = (new Date(y, m, 1).getDay() + 6) % 7
  const total = new Date(y, m + 1, 0).getDate()
  const cells = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))
}
