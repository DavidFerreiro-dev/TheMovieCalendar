import { useEffect, useState } from 'react'
import { Film } from 'lucide-react'
import { img } from '../lib/tmdb'

export default function Poster({ path, title, size = 'w342', className = '' }) {
  const src = img(path, size)
  const [failedSrc, setFailedSrc] = useState(null)

  useEffect(() => setFailedSrc(null), [src])

  if (src && failedSrc !== src) {
    return (
      <img
        className={`poster ${className}`}
        src={src}
        alt={title}
        loading="lazy"
        draggable={false}
        onError={() => setFailedSrc(src)}
      />
    )
  }

  return (
    <div className={`poster poster-empty ${className}`} role="img" aria-label={title}>
      <Film size={22} strokeWidth={1.5} />
      <span>{title}</span>
    </div>
  )
}
