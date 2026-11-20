import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../../lib/supabase/client'
import { getUpcomingOccasions } from './getUpcomingOccasions'

interface DashboardPanelProps {
  coupleId: string
}

interface Occasion {
  id: string
  title: string
  occasion_date: string
  repeats_yearly: boolean
}

interface UpcomingOccasion extends Occasion {
  nextDate: Date
}

interface Activity {
  id: string
  title: string
  status: 'idea' | 'planned' | 'done'
}

interface Memory {
  id: string
  title: string
  memory_type: 'memory' | 'place' | 'recipe' | 'trip' | 'gift' | 'other'
}

export function DashboardPanel({ coupleId }: DashboardPanelProps) {
  const [occasions, setOccasions] = useState<UpcomingOccasion[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      setLoading(true)
      setErrorMessage('')

      try {
        const supabase = getSupabaseClient()
        const [occasionResult, activityResult, memoryResult] = await Promise.all([
          supabase
            .from('occasions')
            .select('id, title, occasion_date, repeats_yearly')
            .eq('couple_id', coupleId),
          supabase
            .from('activity_suggestions')
            .select('id, title, status')
            .eq('couple_id', coupleId)
            .eq('status', 'planned')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('memories')
            .select('id, title, memory_type')
            .eq('couple_id', coupleId)
            .order('created_at', { ascending: false })
            .limit(5),
        ])

        if (occasionResult.error) throw occasionResult.error
        if (activityResult.error) throw activityResult.error
        if (memoryResult.error) throw memoryResult.error
        if (!active) return

        setOccasions(
          getUpcomingOccasions(occasionResult.data as Occasion[]).map(
            ({ occasion, nextDate }) => ({ ...occasion, nextDate }),
          ),
        )
        setActivities(activityResult.data as Activity[])
        setMemories(memoryResult.data as Memory[])
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Could not load dashboard information.',
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadDashboard()
    return () => {
      active = false
    }
  }, [coupleId])

  return (
    <section className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
      <p className="mt-1 text-slate-600">A quick look at what matters next.</p>

      {errorMessage && (
        <p className="mt-5 text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-slate-600">Loading dashboard...</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <article className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">Upcoming dates</h3>
            {occasions.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No upcoming dates.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {occasions.map((occasion) => (
                  <li key={occasion.id}>
                    <span className="font-medium text-slate-800">{occasion.title}</span>
                    <span className="block text-slate-500">
                      {new Intl.DateTimeFormat(undefined, {
                        month: 'short',
                        day: 'numeric',
                      }).format(occasion.nextDate)}
                      {occasion.repeats_yearly ? ' · yearly' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">Planned activities</h3>
            {activities.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Nothing planned yet.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {activities.map((activity) => (
                  <li className="font-medium text-slate-800" key={activity.id}>
                    {activity.title}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">Recent memories</h3>
            {memories.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No memories saved yet.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {memories.map((memory) => (
                  <li key={memory.id}>
                    <span className="font-medium text-slate-800">{memory.title}</span>
                    <span className="block text-slate-500">{memory.memory_type}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      )}
    </section>
  )
}
