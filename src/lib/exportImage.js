import { img } from './tmdb'
import { buildWeeks, coverOf, keyOf, monthName } from './store'

const FONT = '"Bricolage Grotesque Variable", system-ui, sans-serif'
const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export const FORMATS = {
  horizontal: { w: 1920, h: 1080, label: 'Horizontal 16:9', hint: '1920 × 1080 · YouTube & screens' },
  vertical: { w: 1080, h: 1920, label: 'Vertical 9:16', hint: '1080 × 1920 · Stories, Reels & TikTok' },
}

function loadImg(src) {
  if (!src) return Promise.resolve(null)
  return new Promise((resolve) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    let finished = false

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true
        resolve(null)
      }
    }, 10000)

    image.onload = () => {
      if (!finished) {
        finished = true
        clearTimeout(timer)
        resolve(image)
      }
    }

    image.onerror = () => {
      // Fallback: fetch blob and convert to base64 Data URL to bypass browser cache & CORS taint on mobile WebKit
      fetch(src)
        .then((res) => {
          if (!res.ok) throw new Error('Fetch failed')
          return res.blob()
        })
        .then((blob) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            if (finished) return
            const fallback = new Image()
            fallback.onload = () => {
              if (!finished) {
                finished = true
                clearTimeout(timer)
                resolve(fallback)
              }
            }
            fallback.onerror = () => {
              if (!finished) {
                finished = true
                clearTimeout(timer)
                resolve(null)
              }
            }
            fallback.src = reader.result
          }
          reader.readAsDataURL(blob)
        })
        .catch(() => {
          if (!finished) {
            finished = true
            clearTimeout(timer)
            resolve(null)
          }
        })
    }

    image.src = src
  })
}

const rrect = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r) }

function cover(c, im, x, y, w, h, r) {
  c.save(); rrect(c, x, y, w, h, r); c.clip()
  const s = Math.max(w / im.width, h / im.height)
  c.drawImage(im, x + (w - im.width * s) / 2, y + (h - im.height * s) / 2, im.width * s, im.height * s)
  c.restore()
}

function contain(c, im, x, y, w, h, r) {
  c.save(); rrect(c, x, y, w, h, r); c.clip()
  const s = Math.min(w / im.width, h / im.height)
  c.drawImage(im, x + (w - im.width * s) / 2, y + (h - im.height * s) / 2, im.width * s, im.height * s)
  c.restore()
}

export async function renderCalendar(state, year, month, format) {
  const { w: W, h: H } = FORMATS[format]
  const landscape = format === 'horizontal'
  await Promise.all([document.fonts.load(`700 80px ${FONT}`), document.fonts.load(`300 80px ${FONT}`)])

  const weeks = buildWeeks(year, month)
  const lead = weeks[0].filter((d) => d === null).length
  const out = (row, col) => new Date(year, month, row * 7 + col - lead + 1)

  // Map all cells in the grid, including overflow dates from previous/next month
  const allCells = weeks.flatMap((wk, row) =>
    wk.map((d, col) => {
      const date = d ? null : out(row, col)
      const key = d ? keyOf(year, month, d) : keyOf(date.getFullYear(), date.getMonth(), date.getDate())
      const dayNum = d || date.getDate()
      const isOther = !d
      return { row, col, key, dayNum, isOther }
    })
  )

  const covers = {}
  // Always use w500 for export: avoids cache collisions with on-screen w185/w342 posters
  await Promise.all(
    allCells.map(async (cell) => {
      const day = state.days[cell.key]
      const m = coverOf(day)
      if (m?.poster) {
        const loaded = await loadImg(img(m.poster, 'w500'))
        if (loaded) {
          covers[cell.key] = loaded
        }
      }
    })
  )

  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const c = cv.getContext('2d')
  c.fillStyle = '#0d0d0e'; c.fillRect(0, 0, W, H)

  const prefix = keyOf(year, month, 1).slice(0, 8)
  const count = Object.keys(state.days).filter((k) => k.startsWith(prefix)).reduce((n, k) => n + state.days[k].movies.length, 0)
  const countText = `${count} ${count === 1 ? 'movie' : 'movies'} this month`
  const pad = landscape ? 70 : 60
  const gap = landscape ? 12 : 10

  let gx, gy, gw, gh
  if (landscape) {
    gx = 600; gy = pad; gw = W - gx - pad; gh = H - pad * 2
  } else {
    gx = pad; gy = 330; gw = W - pad * 2; gh = H - gy - 80
  }

  c.textAlign = 'left'
  if (landscape) {
    c.fillStyle = '#8d8a84'; c.font = `400 30px ${FONT}`
    c.fillText(countText, pad, pad + 30)
    c.fillStyle = '#e3a857'; c.font = `300 110px ${FONT}`
    c.fillText(String(year), pad, H - pad - 130)
    // Shrink month name font until it fits inside the left panel
    const maxNameW = gx - pad * 2
    let nameSz = 120
    c.font = `700 ${nameSz}px ${FONT}`
    while (c.measureText(monthName(year, month)).width > maxNameW && nameSz > 40) {
      nameSz -= 4
      c.font = `700 ${nameSz}px ${FONT}`
    }
    c.fillStyle = '#efeae2'
    c.fillText(monthName(year, month), pad, H - pad - 10)
  } else {
    // Dynamic month name in vertical so it never clips on mobile
    const maxNameW = W - pad * 2
    let nameSz = 160
    c.font = `700 ${nameSz}px ${FONT}`
    while (c.measureText(monthName(year, month)).width > maxNameW && nameSz > 50) {
      nameSz -= 4
      c.font = `700 ${nameSz}px ${FONT}`
    }
    c.fillStyle = '#efeae2'
    c.fillText(monthName(year, month), pad - 4, 210)

    c.fillStyle = '#e3a857'; c.font = `300 58px ${FONT}`
    c.fillText(String(year), pad, 280)
    c.fillStyle = '#8d8a84'; c.font = `400 28px ${FONT}`
    c.fillText(countText, W - pad - c.measureText(countText).width, 280)
  }

  const head = 44
  const cellW = (gw - gap * 6) / 7
  // Cap cellH so the full grid fits
  const maxCellH = (gh - head - gap * (weeks.length - 1)) / weeks.length
  const cellH = Math.min(maxCellH, cellW * 1.55)
  const used = head + weeks.length * cellH + (weeks.length - 1) * gap
  const oy = gy + Math.max(0, (gh - used) / 2)

  c.font = `600 24px ${FONT}`; c.fillStyle = '#6f6c67'; c.textAlign = 'center'
  WEEK.forEach((l, i) => c.fillText(l, gx + i * (cellW + gap) + cellW / 2, oy + 28))

  const r = 12
  allCells.forEach(({ row, col, key, dayNum, isOther }) => {
    const x = gx + col * (cellW + gap)
    const y = oy + head + row * (cellH + gap)
    const day = state.days[key]
    const im = covers[key]
    if (im) {
      cover(c, im, x, y, cellW, cellH, r)
      const g = c.createLinearGradient(0, y, 0, y + cellH * 0.4)
      g.addColorStop(0, 'rgba(0,0,0,.75)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      c.save()
      rrect(c, x, y, cellW, cellH, r)
      c.clip()
      c.fillStyle = g
      c.fillRect(x, y, cellW, cellH)
      c.restore()
    } else {
      c.fillStyle = day ? '#26262a' : isOther ? '#111113' : '#17171a'
      rrect(c, x, y, cellW, cellH, r)
      c.fill()
    }
    c.textAlign = 'left'
    c.font = `700 24px ${FONT}`
    c.fillStyle = im ? '#ffffff' : day ? '#d8d4cc' : isOther ? '#44413c' : '#6f6c67'
    c.fillText(String(dayNum), x + 12, y + 32)
    if (day && day.movies.length > 1) {
      const bw = 44, bh = 30
      c.fillStyle = '#e3a857'
      rrect(c, x + cellW - bw - 8, y + cellH - bh - 8, bw, bh, 15)
      c.fill()
      c.fillStyle = '#0d0d0e'
      c.textAlign = 'center'
      c.font = `700 19px ${FONT}`
      c.fillText(`×${day.movies.length}`, x + cellW - bw / 2 - 8, y + cellH - 15)
    }
  })

  return cv
}

export async function downloadCalendar(state, year, month, format) {
  const cv = await renderCalendar(state, year, month, format)
  const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.95))
  const fileName = `movie-calendar-${monthName(year, month)}-${year}.jpg`.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  // Web Share API for mobile devices (prompts direct save to Camera Roll or sharing to Instagram, WhatsApp, etc.)
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], fileName, { type: 'image/jpeg' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Movie Calendar - ${monthName(year, month)} ${year}`,
        })
        return
      }

    } catch (e) {
      if (e.name === 'AbortError') return
    }
  }

  // Fallback anchor download
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

export async function downloadMonth(state, year, month, aspect, format) {
  if (!['vertical', 'horizontal'].includes(aspect)) throw new Error('Month exports support 9:16 or 16:9.')
  if (!['png', 'jpg'].includes(format)) throw new Error('Choose JPG or PNG.')
  const cv = await renderCalendar(state, year, month, aspect)
  const mime = format === 'png' ? 'image/png' : 'image/jpeg'
  const extension = format === 'png' ? 'png' : 'jpg'
  const blob = await new Promise((resolve) => cv.toBlob(resolve, mime, .95))
  const fileName = `movie-calendar-${monthName(year, month)}-${year}.${extension}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

export async function downloadDay(state, date, aspect, format) {
  const day = state.days[date]
  if (!day?.movies?.length) throw new Error('There are no movies logged for this day.')
  if (!['square', 'vertical', 'horizontal'].includes(aspect)) throw new Error('Choose 1:1, 9:16, or 16:9.')
  if (!['png', 'jpg'].includes(format)) throw new Error('Choose JPG or PNG.')
  const dimensions = { square: [1200, 1200], vertical: [1080, 1920], horizontal: [1920, 1080] }
  const [W, H] = dimensions[aspect]
  const rowH = 190
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const c = cv.getContext('2d')
  c.fillStyle = '#0d0d0e'; c.fillRect(0, 0, W, H)
  const posters = await Promise.all(day.movies.map((movie) => loadImg(img(movie.poster, 'w342'))))
  const primaryIndex = Math.max(0, day.movies.findIndex((movie) => movie.id === day.cover))
  const primary = day.movies[primaryIndex]
  const primaryPoster = posters[primaryIndex]
  const headerY = aspect === 'horizontal' ? 80 : 105
  c.textAlign = 'center'
  c.fillStyle = '#e3a857'; c.font = `300 ${aspect === 'vertical' ? 38 : 32}px ${FONT}`; c.fillText('MY MOVIE DAY', W / 2, headerY)
  c.fillStyle = '#efeae2'; c.font = `700 ${aspect === 'vertical' ? 46 : 40}px ${FONT}`; c.fillText(date, W / 2, headerY + 55)
  const posterWidth = aspect === 'horizontal' ? Math.min(360, W * .24) : Math.min(470, W * .52)
  const posterHeight = posterWidth * 1.5
  const posterY = aspect === 'horizontal' ? 175 : 225
  if (primaryPoster) {
    c.save()
    c.shadowColor = 'rgba(0, 0, 0, .65)'; c.shadowBlur = 34; c.shadowOffsetY = 16
    contain(c, primaryPoster, (W - posterWidth) / 2, posterY, posterWidth, posterHeight, 18)
    c.restore()
  } else {
    c.fillStyle = '#212125'; rrect(c, (W - posterWidth) / 2, posterY, posterWidth, posterHeight, 18); c.fill()
  }
  c.fillStyle = '#efeae2'; c.font = `700 ${aspect === 'horizontal' ? 38 : 42}px ${FONT}`
  c.fillText(primary.title.slice(0, 36), W / 2, posterY + posterHeight + 62)
  c.fillStyle = '#8d8a84'; c.font = `400 24px ${FONT}`
  c.fillText(`${primary.year || 'Unknown year'}${primary.letterboxd?.rewatch?.toLowerCase() === 'yes' ? ' · Rewatch' : ''}`, W / 2, posterY + posterHeight + 98)
  const secondary = day.movies.filter((_, index) => index !== primaryIndex)
  if (secondary.length) {
    const thumbSize = aspect === 'horizontal' ? 92 : 86
    const gap = 14
    const totalWidth = Math.min(W - 120, secondary.length * (thumbSize + gap) - gap)
    const startX = (W - totalWidth) / 2
    const thumbY = Math.min(H - thumbSize * 1.5 - 45, posterY + posterHeight + 140)
    secondary.forEach((movie, index) => {
      const x = startX + index * (thumbSize + gap)
      if (posters[day.movies.indexOf(movie)]) contain(c, posters[day.movies.indexOf(movie)], x, thumbY, thumbSize, thumbSize * 1.5, 10)
      c.fillStyle = '#8d8a84'; c.font = `400 16px ${FONT}`; c.fillText(movie.title.slice(0, 16), x + thumbSize / 2, thumbY + thumbSize * 1.5 + 23)
    })
  }
  c.textAlign = 'left'
  const mime = format === 'png' ? 'image/png' : 'image/jpeg'
  const extension = format === 'png' ? 'png' : 'jpg'
  const blob = await new Promise((resolve) => cv.toBlob(resolve, mime, .95))
  if (!blob) throw new Error(`Could not create the ${format.toUpperCase()} image.`)
  const fileName = `movie-day-${date}.${extension}`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
