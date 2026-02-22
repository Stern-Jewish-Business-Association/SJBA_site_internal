import { useState } from 'react'
import { fetchDemoNotes } from '../lib/supabaseRest'

type DemoNote = {
  id: number
  title: string
  inserted_at: string
}

export function HomePage() {
  const [notes, setNotes] = useState<DemoNote[]>([]) // This state variable holds the array of demo notes fetched from Supabase. It is initialized as an empty array and will be updated when the data is successfully retrieved.
  const [isLoading, setIsLoading] = useState(false) //
  const [error, setError] = useState('')

  const loadNotes = async () => { //
    setIsLoading(true)
    setError('')

    try {
      const rows = await fetchDemoNotes()
      setNotes(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="home-section" aria-label="Dashboard preview">
      <h2>Dashboard</h2>
      <p>Click the button to run a demo SELECT from local Supabase.</p>
      <button type="button" onClick={loadNotes} disabled={isLoading}> 
        {isLoading ? 'Loading...' : 'Load demo_notes'}
      </button>

      {error ? <p className="error-text">{error}</p> : null}

      {notes.length > 0 ? ( //
        <ul className="notes-list">
          {notes.map((note) => (
            <li key={note.id}>
              #{note.id} - {note.title}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
