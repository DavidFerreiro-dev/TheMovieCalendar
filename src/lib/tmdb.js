// Las variables VITE_ se incluyen en el código del navegador: no son secretas en una app pública.
const TOKEN = import.meta.env.VITE_TMDB_ACCESS_TOKEN
const API = 'https://api.themoviedb.org/3'

export const hasToken = Boolean(TOKEN) && TOKEN !== 'TU_TOKEN_DE_TMDB'
export const img = (path, size = 'w342') => (path ? `https://image.tmdb.org/t/p/${size}${path}` : null)

export async function searchMovies(query, signal) {
  const url = `${API}/search/movie?query=${encodeURIComponent(query)}&language=es-ES&include_adult=false&page=1`
  const res = await fetch(url, { signal, headers: { Authorization: `Bearer ${TOKEN}`, accept: 'application/json' } })
  if (res.status === 401) throw new Error('El token de TMDB no es válido.')
  if (!res.ok) throw new Error('TMDB no ha respondido correctamente.')
  const data = await res.json()
  return data.results.map((m) => ({
    id: m.id,
    title: m.title,
    original_title: m.original_title,
    year: m.release_date ? m.release_date.slice(0, 4) : '',
    overview: m.overview || '',
    poster: m.poster_path,
    rating: m.vote_average > 0 ? Math.round(m.vote_average * 10) / 10 : null,
  }))
}
