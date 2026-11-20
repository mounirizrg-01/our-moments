import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { Database } from '../../lib/supabase/database.types'
import { getSupabaseClient } from '../../lib/supabase/client'

type Activity = Database['public']['Tables']['activity_suggestions']['Row']
type ActivityCategory = Activity['category']
type ActivityStatus = Activity['status']

interface ActivityBoardProps {
  coupleId: string
}

const categories: { value: ActivityCategory; label: string }[] = [
  { value: 'food', label: 'Food' },
  { value: 'outdoors', label: 'Outdoors' },
  { value: 'at_home', label: 'At home' },
  { value: 'date_night', label: 'Date night' },
  { value: 'travel', label: 'Travel' },
  { value: 'other', label: 'Other' },
]

const statuses: { value: ActivityStatus; label: string }[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'planned', label: 'Planned' },
  { value: 'done', label: 'Done' },
]

export function ActivityBoard({ coupleId }: ActivityBoardProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loadedCoupleId, setLoadedCoupleId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ActivityCategory>('other')
  const [details, setDetails] = useState('')
  const [status, setStatus] = useState<ActivityStatus>('idea')
  const loading = loadedCoupleId !== coupleId

  const fetchActivities = useCallback(async () => {
    const { data, error } = await getSupabaseClient()
      .from('activity_suggestions')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }, [coupleId])

  useEffect(() => {
    let active = true

    void fetchActivities()
      .then((data) => {
        if (active) {
          setActivities(data)
          setErrorMessage('')
          setLoadedCoupleId(coupleId)
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Could not load activity ideas.',
          )
          setLoadedCoupleId(coupleId)
        }
      })

    return () => {
      active = false
    }
  }, [coupleId, fetchActivities])

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setCategory('other')
    setDetails('')
    setStatus('idea')
  }

  function beginEdit(activity: Activity) {
    setEditingId(activity.id)
    setTitle(activity.title)
    setCategory(activity.category)
    setDetails(activity.details ?? '')
    setStatus(activity.status)
    setErrorMessage('')
  }

  async function saveActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')

    const values = {
      title: title.trim(),
      category,
      details: details.trim() || null,
      status,
    }

    try {
      const supabase = getSupabaseClient()
      const result = editingId
        ? await supabase
            .from('activity_suggestions')
            .update(values)
            .eq('id', editingId)
            .eq('couple_id', coupleId)
        : await supabase
            .from('activity_suggestions')
            .insert({ ...values, couple_id: coupleId })

      if (result.error) throw result.error
      setActivities(await fetchActivities())
      resetForm()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not save this activity idea.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(activity: Activity, nextStatus: ActivityStatus) {
    setSaving(true)
    setErrorMessage('')

    try {
      const { error } = await getSupabaseClient()
        .from('activity_suggestions')
        .update({ status: nextStatus })
        .eq('id', activity.id)
        .eq('couple_id', coupleId)

      if (error) throw error
      setActivities(await fetchActivities())
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not update the activity status.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteActivity(activity: Activity) {
    if (!window.confirm(`Delete "${activity.title}"?`)) return

    setSaving(true)
    setErrorMessage('')

    try {
      const { error } = await getSupabaseClient()
        .from('activity_suggestions')
        .delete()
        .eq('id', activity.id)
        .eq('couple_id', coupleId)

      if (error) throw error
      setActivities(await fetchActivities())
      if (editingId === activity.id) resetForm()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not delete this activity idea.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Activity ideas</h2>
        <p className="mt-1 text-slate-600">
          Save ideas together and track what you’ve planned or done.
        </p>
      </div>

      {errorMessage && (
        <p className="mt-5 text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      )}

      <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={saveActivity}>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="activity-title">
            Activity
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            id="activity-title"
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            required
            value={title}
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium text-slate-700"
            htmlFor="activity-category"
          >
            Category
          </label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            id="activity-category"
            onChange={(event) => {
              const next = categories.find((option) => option.value === event.target.value)
              if (next) setCategory(next.value)
            }}
            value={category}
          >
            {categories.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label
            className="block text-sm font-medium text-slate-700"
            htmlFor="activity-details"
          >
            Notes (optional)
          </label>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            id="activity-details"
            maxLength={1000}
            onChange={(event) => setDetails(event.target.value)}
            rows={3}
            value={details}
          />
        </div>

        {editingId && (
          <div>
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="activity-status"
            >
              Status
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
              id="activity-status"
              onChange={(event) => {
                const next = statuses.find((option) => option.value === event.target.value)
                if (next) setStatus(next.value)
              }}
              value={status}
            >
              {statuses.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-3 sm:col-span-2">
          <button
            className="rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add idea'}
          </button>
          {editingId && (
            <button
              className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
              onClick={resetForm}
              type="button"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <h3 className="font-semibold text-slate-900">Your ideas</h3>
        {loading ? (
          <p className="mt-3 text-sm text-slate-600">Loading ideas…</p>
        ) : activities.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No activity ideas saved yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {activities.map((activity) => (
              <li
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
                key={activity.id}
              >
                <div>
                  <p className="font-semibold text-slate-900">{activity.title}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {categories.find((option) => option.value === activity.category)?.label}
                    {' · '}
                    {statuses.find((option) => option.value === activity.status)?.label}
                  </p>
                  {activity.details && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                      {activity.details}
                    </p>
                  )}
                  <label className="mt-3 block text-xs font-medium text-slate-600">
                    Update status
                    <select
                      aria-label={`Status for ${activity.title}`}
                      className="ml-2 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800"
                      disabled={saving}
                      onChange={(event) => {
                        const next = statuses.find(
                          (option) => option.value === event.target.value,
                        )
                        if (next && next.value !== activity.status) {
                          void updateStatus(activity, next.value)
                        }
                      }}
                      value={activity.status}
                    >
                      {statuses.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => beginEdit(activity)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                    disabled={saving}
                    onClick={() => void deleteActivity(activity)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
