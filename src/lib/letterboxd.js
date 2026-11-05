import { searchMovies } from './tmdb'

const REQUIRED = ['Date', 'Name', 'Year', 'Letterboxd URI', 'Rating', 'Rewatch', 'Tags', 'Watched Date']

function parseCsv(text) {
  const rows = []
  let row = [], field = '', quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1 }
      else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1
      row.push(field); field = ''
      if (row.some((v) => v.trim())) rows.push(row)
      row = []
    } else field += ch
  }
  if (field || row.length) { row.push(field); if (row.some((v) => v.trim())) rows.push(row) }
  if (rows.length < 2) throw new Error('The CSV does not contain any diary records.')
  const headers = rows[0].map((h) => h.trim().replace(/^\uFEFF/, ''))
  const missing = REQUIRED.filter((h) => !headers.includes(h))
  if (missing.length) throw new Error(`This is not a Letterboxd diary.csv. Missing: ${missing.join(', ')}`)
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((h, i) => [h, (values[i] || '').trim()])))
}

const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00`))
const stableId = (row, occurrence) => {
  const raw = REQUIRED.map((key) => row[key] || '').join('\u001f')
  let hash = 2166136261
  for (let i = 0; i < raw.length; i += 1) hash = Math.imul(hash ^ raw.charCodeAt(i), 16777619)
  return `lb-${(hash >>> 0).toString(16)}-${occurrence}`
}

export async function inspectLetterboxd(file, onProgress = () => {}) {
  const rows = parseCsv(await file.text())
  const invalid = []
  const occurrences = new Map()
  const records = rows.map((row, index) => {
    if (!row.Name || !validDate(row.Date)) { invalid.push(index + 2); return null }
    const fingerprint = REQUIRED.map((key) => row[key] || '').join('\u001f')
    const occurrence = occurrences.get(fingerprint) || 0
    occurrences.set(fingerprint, occurrence + 1)
    return {
      sourceId: stableId(row, occurrence), date: row.Date, title: row.Name, year: row.Year,
      uri: row['Letterboxd URI'], watchedDate: row['Watched Date'],
      letterboxdRating: row.Rating, rewatch: row.Rewatch, tags: row.Tags,
    }
  }).filter(Boolean)

  const cache = new Map()
  const resolved = []
  for (let i = 0; i < records.length; i += 1) {
    const record = records[i]
    const cacheKey = `${record.title.toLowerCase()}|${record.year}`
    let movie = cache.get(cacheKey)
    if (movie === undefined) {
      try {
        const results = await searchMovies(record.title)
        movie = results.find((m) => String(m.year) === String(record.year)) || results[0] || null
      } catch {
        movie = null
      }
      cache.set(cacheKey, movie)
    }
    resolved.push({
      id: record.sourceId, tmdbId: movie?.tmdbId || null, type: 'movie',
      title: movie?.title || record.title, original_title: movie?.original_title || record.title,
      year: record.year || movie?.year || '', overview: movie?.overview || '',
      poster: movie?.poster || null, rating: movie?.rating || null, letterboxd: record,
    })
    onProgress(i + 1, records.length)
  }
  return { records: resolved, invalid, totalRows: rows.length - 1 }
}
