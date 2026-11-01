import { img } from './tmdb'
import { buildWeeks, coverOf, keyOf, monthName } from './store'

const FONT = '"Bricolage Grotesque Variable", system-ui, sans-serif'
const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export const FORMATS = {
  horizontal: { w: 1920, h: 1080, label: 'Horizontal 16:9', hint: '1920 × 1080 · YouTube & screens' },
  vertical: { w: 1080, h: 1920, label: 'Vertical 9:16', hint: '1080 × 1920 · Stories, Reels & TikTok' },
}

const loadImg = (src) =>
  new Promise((res) => {
    const i = new Image()
    i.crossOrigin = 'anonymous'
    i.onload = () => res(i)
    i.onerror = () => res(null)
    i.src = src
  })

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
  const covers = {}
  await Promise.all(
    weeks.flat().filter(Boolean).map(async (d) => {
      const m = coverOf(state.days[keyOf(year, month, d)])
      if (m?.poster) covers[d] = await loadImg(img(m.poster, 'w500'))
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
  if (landscape) { gx = 600; gy = pad; gw = W - gx - pad; gh = H - pad * 2 }
  else { gx = pad; gy = 400; gw = W - pad * 2; gh = H - gy - pad }

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
    c.fillStyle = '#efeae2'; c.font = `700 190px ${FONT}`
    c.fillText(monthName(year, month), pad - 6, 260)
    c.fillStyle = '#e3a857'; c.font = `300 64px ${FONT}`
    c.fillText(String(year), pad, 340)
    c.fillStyle = '#8d8a84'; c.font = `400 30px ${FONT}`
    c.fillText(countText, W - pad - c.measureText(countText).width, 340)
  }

  const head = 44
  const cellW = (gw - gap * 6) / 7
  const cellH = Math.min((gh - head - gap * (weeks.length - 1)) / weeks.length, cellW * 1.55)
  const used = head + weeks.length * cellH + (weeks.length - 1) * gap
  const oy = gy + (landscape ? (gh - used) / 2 : 0)

  c.font = `600 24px ${FONT}`; c.fillStyle = '#6f6c67'; c.textAlign = 'center'
  WEEK.forEach((l, i) => c.fillText(l, gx + i * (cellW + gap) + cellW / 2, oy + 28))

  const r = 12
  weeks.forEach((wk, row) =>
    wk.forEach((d, col) => {
      if (!d) return
      const x = gx + col * (cellW + gap)
      const y = oy + head + row * (cellH + gap)
      const day = state.days[keyOf(year, month, d)]
      const im = covers[d]
      if (im) {
        cover(c, im, x, y, cellW, cellH, r)
        const g = c.createLinearGradient(0, y, 0, y + cellH * 0.4)
        g.addColorStop(0, 'rgba(0,0,0,.7)'); g.addColorStop(1, 'rgba(0,0,0,0)')
        c.save(); rrect(c, x, y, cellW, cellH, r); c.clip(); c.fillStyle = g; c.fillRect(x, y, cellW, cellH); c.restore()
      } else {
        c.fillStyle = day ? '#26262a' : '#151517'
        rrect(c, x, y, cellW, cellH, r); c.fill()
      }
      c.textAlign = 'left'; c.font = `700 24px ${FONT}`
      c.fillStyle = im ? '#ffffff' : day ? '#d8d4cc' : '#55524d'
      c.fillText(String(d), x + 12, y + 32)
      if (day && day.movies.length > 1) {
        const bw = 44, bh = 30
        c.fillStyle = '#e3a857'; rrect(c, x + cellW - bw - 8, y + cellH - bh - 8, bw, bh, 15); c.fill()
        c.fillStyle = '#0d0d0e'; c.textAlign = 'center'; c.font = `700 19px ${FONT}`
        c.fillText(`×${day.movies.length}`, x + cellW - bw / 2 - 8, y + cellH - 15)
      }
    })
  )
  return cv
}

export async function downloadCalendar(state, year, month, format) {
  const cv = await renderCalendar(state, year, month, format)
  const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.93))
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `movie-calendar-${monthName(year, month)}-${year}.jpg`.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
