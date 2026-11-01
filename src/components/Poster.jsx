import { Film } from 'lucide-react'
import { img } from '../lib/tmdb'

export default function Poster({ path, title, size = 'w342', className = '' }) {
  const src = img(path, size)
  return src ? (
    <img className={`poster ${className}`} src={src} alt={title} loading="lazy" draggable={false} />
  ) : (
    <div className={`poster poster-empty ${className}`} role="img" aria-label={title}>
      <Film size={22} strokeWidth={1.5} />
      <span>{title}</span>
    </div>
  )
}
