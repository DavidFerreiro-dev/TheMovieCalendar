import { useState } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowLeft, GripVertical, Plus, Star, Trash2, X } from 'lucide-react'
import Poster from './Poster'

function Row({ movie, index, isCover, onOpen, onCover }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: movie.id })
  return (
    <li ref={setNodeRef} className={`row ${isDragging ? 'dragging' : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <button className="handle" {...attributes} {...listeners} aria-label={`Move ${movie.title}`}><GripVertical size={20} /></button>
      <span className="pos">{index + 1}</span>
      <button className="row-main" onClick={() => onOpen(movie)}>
        <Poster path={movie.poster} title={movie.title} size="w185" />
        <span className="r-info">
          <strong>{movie.title}</strong>
          <small>{movie.year || 'No date'}</small>
        </span>
      </button>
      <button className={`star ${isCover ? 'on' : ''}`} onClick={() => onCover(movie.id)} aria-pressed={isCover} title={isCover ? 'Day cover' : 'Set as cover'}>
        <Star size={18} fill={isCover ? 'currentColor' : 'none'} />
        <span>{isCover ? 'Cover' : ''}</span>
      </button>
    </li>
  )
}

export default function DayPanel({ date, day, dispatch, onAdd, onClose }) {
  const [detail, setDetail] = useState(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const movies = day?.movies || []
  const full = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const current = detail && movies.find((m) => m.id === detail.id)

  const onEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const from = movies.findIndex((m) => m.id === active.id)
    const to = movies.findIndex((m) => m.id === over.id)
    dispatch({ type: 'reorder', date, movies: arrayMove(movies, from, to) })
  }
  const remove = (id) => { dispatch({ type: 'remove', date, id }); setDetail(null) }

  return (
    <div className="overlay sheet-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="sheet" role="dialog" aria-label="Day detail">
        {current ? (
          <div className="detail">
            <header className="modal-head">
              <button className="btn ghost" onClick={() => setDetail(null)}><ArrowLeft size={18} /> Back to day</button>
              <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
            </header>
            <div className="detail-body">
              <Poster path={current.poster} title={current.title} size="w500" className="detail-poster" />
              <div className="detail-text">
                <h2>{current.title}</h2>
                <p className="muted">
                  {current.original_title !== current.title && <>{current.original_title} · </>}{current.year || 'No date'}
                  {current.rating && <> · ★ {current.rating} on TMDB</>}
                </p>
                <p className="synopsis">{current.overview || 'TMDB has no synopsis in English for this title.'}</p>
                <div className="actions">
                  <button className={`btn ${day.cover === current.id ? 'accent' : ''}`} onClick={() => dispatch({ type: 'cover', date, id: current.id })}>
                    <Star size={16} fill={day.cover === current.id ? 'currentColor' : 'none'} /> {day.cover === current.id ? 'Day cover' : 'Set as cover'}
                  </button>
                  <button className="btn danger" onClick={() => remove(current.id)}><Trash2 size={16} /> Remove from this day</button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <header className="modal-head">
              <div>
                <h2 className="cap">{full}</h2>
                <p className="muted">{movies.length ? `${movies.length} ${movies.length === 1 ? 'movie' : 'movies'}` : 'Nothing logged'}</p>
              </div>
              <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
            </header>
            {movies.length ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onEnd}>
                <SortableContext items={movies.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                  <ul className="list">
                    {movies.map((m, i) => (
                      <Row key={m.id} movie={m} index={i} isCover={day.cover === m.id} onOpen={setDetail} onCover={(id) => dispatch({ type: 'cover', date, id })} />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            ) : (
              <p className="msg">This day is empty. Add what you watched.</p>
            )}
            <button className="btn accent wide" onClick={onAdd}><Plus size={18} /> Add movie</button>
          </>
        )}
      </aside>
    </div>
  )
}
