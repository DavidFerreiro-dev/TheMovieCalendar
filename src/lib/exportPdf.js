import { jsPDF } from 'jspdf'
import { img } from './tmdb'
import { monthName } from './store'

const colors = { bg: [13, 13, 14], text: [239, 234, 226], muted: [141, 138, 132], accent: [227, 168, 87] }
const allMovies = (state) => Object.entries(state.days).flatMap(([date, day]) => day.movies.map((movie) => ({ ...movie, date })))
const monthsBetween = (start, end) => {
  const out = []; const cursor = new Date(`${start}-01T12:00:00`); const last = new Date(`${end}-01T12:00:00`)
  while (cursor <= last) { out.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`); cursor.setMonth(cursor.getMonth() + 1) }
  return out
}
const posterData = (path) => new Promise((resolve) => {
  if (!path) return resolve(null)
  const image = new Image(); image.crossOrigin = 'anonymous'
  image.onload = () => {
    try {
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
      canvas.getContext('2d').drawImage(image, 0, 0)
      resolve({ data: canvas.toDataURL('image/jpeg', .82), canvas, width: image.width, height: image.height })
    } catch { resolve(null) }
  }
  image.onerror = () => resolve(null); image.src = img(path, 'w185')
})

const fitPoster = (doc, poster, x, y, width, height) => {
  if (!poster) return
  const ratio = poster.width / poster.height
  const drawWidth = Math.min(width, height * ratio)
  const drawHeight = Math.min(height, width / ratio)
  try { doc.addImage(poster.data, 'JPEG', x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight, undefined, 'FAST') } catch { /* Poster is optional. */ }
}

export async function downloadHistoryPdf(state, onProgress = () => {}) {
  const movies = allMovies(state).sort((a, b) => a.date.localeCompare(b.date))
  if (!movies.length) throw new Error('Add at least one movie before exporting your history.')
  const first = movies[0].date.slice(0, 7); const last = movies[movies.length - 1].date.slice(0, 7)
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const page = (title) => {
    doc.setFillColor(...colors.bg); doc.rect(0, 0, 210, 297, 'F')
    doc.setTextColor(...colors.text); doc.setFont('helvetica', 'bold')
    let size = 24
    doc.setFontSize(size)
    while (doc.getTextWidth(title) > 174 && size > 14) { size -= 1; doc.setFontSize(size) }
    doc.text(title, 18, 24)
  }
  page('My Movie History')
  doc.setTextColor(...colors.accent); doc.setFontSize(18); doc.text('My Cinematic Journey', 18, 36)
  doc.setTextColor(...colors.muted); doc.setFontSize(11)
  doc.text(`Generated ${new Date().toLocaleDateString('en-US')}`, 18, 52)
  doc.text(`${first.slice(0, 4)} — ${last.slice(0, 4)}`, 18, 60)
  doc.setTextColor(...colors.text); doc.setFontSize(15); doc.text(`${movies.length} films`, 18, 88); doc.text(`${Object.keys(state.days).length} active days`, 18, 98)

  const ratings = movies.map((m) => Number(m.letterboxd?.letterboxdRating)).filter(Boolean)
  const years = Object.entries(movies.reduce((a, m) => { const y = m.date.slice(0, 4); a[y] = (a[y] || 0) + 1; return a }, {})).sort((a, b) => b[1] - a[1])
  const months = Object.entries(movies.reduce((a, m) => { const k = m.date.slice(0, 7); a[k] = (a[k] || 0) + 1; return a }, {})).sort((a, b) => b[1] - a[1])
  doc.addPage(); page('General statistics'); doc.setFontSize(12); doc.setTextColor(...colors.text)
  const stats = [`Films watched: ${movies.length}`, `Rewatches: ${movies.filter((m) => m.letterboxd?.rewatch?.toLowerCase() === 'yes').length}`, `Rated films: ${ratings.length}`, `Average Letterboxd rating: ${ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2) : '—'}`, `Busiest year: ${years[0]?.[0] || '—'}`, `Busiest month: ${months[0]?.[0] || '—'}`, `Average films per month: ${(movies.length / monthsBetween(first, last).length).toFixed(1)}`]
  stats.forEach((text, i) => doc.text(text, 20, 52 + i * 12))

  const calendarMonths = monthsBetween(first, last)
  for (let i = 0; i < calendarMonths.length; i += 1) {
    const key = calendarMonths[i]; doc.addPage(); page(`${monthName(Number(key.slice(0, 4)), Number(key.slice(5) - 1))} ${key.slice(0, 4)}`)
    const year = Number(key.slice(0, 4)); const month = Number(key.slice(5)) - 1
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const lead = (new Date(year, month, 1).getDay() + 6) % 7
    const cellW = 174 / 7; const cellH = 35
    const dayMovies = {}
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dayKey = `${key}-${String(day).padStart(2, '0')}`
      dayMovies[dayKey] = state.days[dayKey]?.movies || []
    }
    const posterByDay = {}
    await Promise.all(Object.entries(dayMovies).map(async ([dayKey, entries]) => {
      const poster = await posterData(entries[0]?.poster)
      if (poster) posterByDay[dayKey] = poster
    }))
    doc.setFontSize(6); doc.setTextColor(...colors.muted)
    ;['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((label, index) => doc.text(label, 20 + index * cellW, 37))
    for (let day = 1; day <= daysInMonth; day += 1) {
      const position = lead + day - 1
      const dayKey = `${key}-${String(day).padStart(2, '0')}`
      const entries = dayMovies[dayKey]
      const x = 18 + (position % 7) * cellW; const y = 40 + Math.floor(position / 7) * cellH
      const poster = posterByDay[dayKey]
      doc.setFillColor(...(entries.length ? [38, 38, 42] : [23, 23, 26]))
      doc.setDrawColor(53, 53, 57); doc.rect(x, y, cellW - 1, cellH - 1, 'FD')
      if (poster) fitPoster(doc, poster, x + 2, y + 2, cellW - 5, cellH - 5)
      doc.setTextColor(...colors.text); doc.setFontSize(6); doc.text(String(day), x + 2, y + 5)
      if (entries.length) {
        if (entries.length > 1) {
          doc.setFillColor(...colors.accent); doc.roundedRect(x + cellW - 10, y + 2, 8, 5, 2, 2, 'F')
          doc.setTextColor(...colors.bg); doc.setFontSize(5)
          doc.text(`×${entries.length}`, x + cellW - 7, y + 5)
        }
      }
    }
    const monthMovies = movies.filter((movie) => movie.date.startsWith(key))
    if (monthMovies.length) {
      doc.addPage()
      page(`${monthName(year, month)} ${year} · Films watched`)
      doc.setTextColor(...colors.muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      doc.text(`${monthMovies.length} films watched`, 18, 35)

      const columns = 2
      const rows = Math.ceil(monthMovies.length / columns)
      const top = 43
      const bottom = 282
      const gapX = 5
      const gapY = 4
      const cardWidth = (174 - gapX) / columns
      const cardHeight = Math.max(10, Math.min(42, (bottom - top - (rows - 1) * gapY) / rows))
      const posterWidth = Math.min(22, cardHeight - 4)
      const posterHeight = Math.max(4, cardHeight - 4)
      const titleSize = cardHeight < 18 ? 4.5 : cardHeight < 26 ? 6 : 8
      const detailSize = Math.max(3.5, titleSize - 1.5)

      const posters = await Promise.all(monthMovies.map((movie) => posterData(movie.poster)))
      monthMovies.forEach((movie, index) => {
        const row = Math.floor(index / columns)
        const column = index % columns
        const x = 18 + column * (cardWidth + gapX)
        const y = top + row * (cardHeight + gapY)
        const poster = posters[index]
        doc.setFillColor(23, 23, 26); doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F')
        if (poster) fitPoster(doc, poster, x + 2, y + 2, posterWidth, posterHeight)
        const textX = x + posterWidth + 5
        const textWidth = cardWidth - posterWidth - 8
        doc.setTextColor(...colors.text); doc.setFont('helvetica', 'bold'); doc.setFontSize(titleSize)
        const title = movie.title.length > 42 ? `${movie.title.slice(0, 39)}…` : movie.title
        doc.text(title, textX, y + Math.min(cardHeight * .42, 9), { maxWidth: textWidth })
        doc.setTextColor(...colors.muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(detailSize)
        const details = [movie.date, movie.year, movie.letterboxd?.rewatch?.toLowerCase() === 'yes' ? 'Rewatch' : '', movie.letterboxd?.letterboxdRating ? `Rating ${movie.letterboxd.letterboxdRating}` : ''].filter(Boolean).join(' · ')
        if (cardHeight >= 16) doc.text(details, textX, y + Math.min(cardHeight * .72, 15), { maxWidth: textWidth })
      })
    }
    onProgress(i + 1, calendarMonths.length)
  }
  doc.addPage(); page('Evolution')
  doc.setTextColor(...colors.text); doc.setFontSize(12); doc.text('Films watched by year', 18, 42)
  years.reverse().forEach(([year, count], i) => { const x = 25 + i * 32; const h = Math.min(150, count * 8); doc.setFillColor(...colors.accent); doc.rect(x, 220 - h, 18, h, 'F'); doc.setTextColor(...colors.muted); doc.text(year, x - 2, 230); doc.text(String(count), x + 5, 215 - h) })
  doc.save('my-movie-history.pdf')
}
