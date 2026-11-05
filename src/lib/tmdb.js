// VITE_ variables are bundled into the browser build: they are not secret in a public app.
const TOKEN = import.meta.env.VITE_TMDB_ACCESS_TOKEN
const API = 'https://api.themoviedb.org/3'

export const hasToken = Boolean(TOKEN) && TOKEN !== 'TU_TOKEN_DE_TMDB'
export const img = (path, size = 'w342') => {
  if (!path) return null
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path
  return `https://image.tmdb.org/t/p/${size}${path.startsWith('/') ? path : `/${path}`}`
}

async function tmdbSearch(endpoint, query, signal) {
  const url = `${API}${endpoint}?query=${encodeURIComponent(query)}&language=en-US&include_adult=false&page=1`
  const res = await fetch(url, { signal, headers: { Authorization: `Bearer ${TOKEN}`, accept: 'application/json' } })
  if (res.status === 401) throw new Error('Invalid TMDB token.')
  if (!res.ok) throw new Error('TMDB did not respond correctly.')
  return res.json()
}

export async function findMovie(title, year) {
  const data = await tmdbSearch('/search/movie', title)
  return data.results.find((m) => year && m.release_date?.startsWith(String(year))) || data.results[0] || null
}

export async function searchMovies(query, signal) {
  const data = await tmdbSearch('/search/movie', query, signal)
  return data.results.map((m) => ({
    id: `mv-${m.id}`,
    tmdbId: m.id,
    type: 'movie',
    title: m.title,
    original_title: m.original_title,
    year: m.release_date ? m.release_date.slice(0, 4) : '',
    overview: m.overview || '',
    poster: m.poster_path || m.backdrop_path,
    rating: m.vote_average > 0 ? Math.round(m.vote_average * 10) / 10 : null,
  }))
}

export async function searchSeries(query, signal) {
  const data = await tmdbSearch('/search/tv', query, signal)
  return data.results.map((m) => ({
    id: `tv-${m.id}`,
    tmdbId: m.id,
    type: 'tv',
    title: m.name,
    original_title: m.original_name,
    year: m.first_air_date ? m.first_air_date.slice(0, 4) : '',
    overview: m.overview || '',
    poster: m.poster_path || m.backdrop_path,
    rating: m.vote_average > 0 ? Math.round(m.vote_average * 10) / 10 : null,
  }))
}
