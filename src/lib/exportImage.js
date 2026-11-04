import { img } from './tmdb'
import { buildWeeks, coverOf, keyOf, monthName } from './store'

const FONT = '"Bricolage Grotesque Variable", system-ui, sans-serif'
const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export const FORMATS = {
  horizontal: { w: 1920, h: 1080, label: 'Horizontal 16:9', hint: '1920 × 1080 · YouTube & screens' },
  vertical: { w: 1080, h: 1920, label: 'Vertical 9:16', hint: '1080 × 1920 · Stories, Reels & TikTok' },
}

async function loadImg(src) {
  if (!src) return null
  try {
    const res = await fetch(src, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    return await new Promise((resolve) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        resolve(null)
      }
      i.src = objectUrl
    })
  } catch {
    return new Promise((resolve) => {
      const i = new Image()
      i.crossOrigin = 'anonymous'
      i.onload = () => resolve(i)
      i.onerror = () => resolve(null)
      i.src = src
    })
  }
}

const rrect = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r) }

function cover(c, im, x, y, w, h, r) {
  c.save(); rrect(c, x, y, w, h, r); c.clip()
  const s = Math.max(w / im.width, h / im.height)
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
  const posterSize = landscape ? 'w500' : 'w342'
  await Promise.all(
    allCells.map(async (cell) => {
      const m = coverOf(state.days[cell.key])
      if (m?.poster) {
        covers[cell.key] = await loadImg(img(m.poster, posterSize))
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
