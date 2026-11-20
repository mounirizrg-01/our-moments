import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { Database } from '../../lib/supabase/database.types'
import { getSupabaseClient } from '../../lib/supabase/client'

type Reminder = Database['public']['Tables']['reminders']['Row']
type Occasion = Database['public']['Tables']['occasions']['Row']

interface RemindersPanelProps {
  coupleId: string
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function RemindersPanel({ coupleId }: RemindersPanelProps) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [occasions, setOccasions] = useState<Occasion[]>([])
  const [loadedCoupleId, setLoadedCoupleId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [title, setTitle] = useState('')
  const [remindAt, setRemindAt] = useState('')
  const [occasionId, setOccasionId] = useState('')

  const loading = loadedCoupleId !== coupleId

  const fetchReminders = useCallback(async () => {
    const supabase = getSupabaseClient()
    const [reminderResult, occasionResult] = await Promise.all([
      supabase
        .from('reminders')
        .select('*')
        .eq('couple_id', coupleId)
        .is('dismissed_at', null)
        .order('remind_at', { ascending: true }),
      supabase
        .from('occasions')
        .select('*')
        .eq('couple_id', coupleId)
        .order('occasion_date', { ascending: true }),
    ])

    if (reminderResult.error) throw reminderResult.error
    if (occasionResult.error) throw occasionResult.error
    return {
      reminders: reminderResult.data,
      occasions: occasionResult.data,
    }
  }, [coupleId])

  useEffect(() => {
    let active = true

    void fetchReminders()
      .then(({ reminders, occasions }) => {
        if (!active) return
        setReminders(reminders)
        setOccasions(occasions)
        setErrorMessage('')
        setLoadedCoupleId(coupleId)
      })
      .catch((error: unknown) => {
        if (!active) return
        setErrorMessage(
          error instanceof Error ? error.message : 'Could not load reminders.',
        )
        setLoadedCoupleId(coupleId)
      })

    return () => {
      active = false
    }
  }, [coupleId, fetchReminders])

  async function saveReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')

    try {
      const reminderTime = new Date(remindAt).toISOString()
      const { error } = await getSupabaseClient()
        .from('reminders')
        .insert({
          couple_id: coupleId,
          occasion_id: occasionId || null,
          title: title.trim(),
          remind_at: reminderTime,
        })

      if (error) throw error
      const data = await fetchReminders()
      setReminders(data.reminders)
      setTitle('')
      setRemindAt('')
      setOccasionId('')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not save the reminder.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function snoozeReminder(reminder: Reminder) {
    setSaving(true)
    setErrorMessage('')

    try {
      const nextReminder = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const { error } = await getSupabaseClient()
        .from('reminders')
        .update({
          snoozed_until: nextReminder,
          remind_at: nextReminder,
        })
        .eq('id', reminder.id)
        .eq('couple_id', coupleId)

      if (error) throw error
      const data = await fetchReminders()
      setReminders(data.reminders)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not snooze the reminder.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function dismissReminder(reminder: Reminder) {
    setSaving(true)
    setErrorMessage('')

    try {
      const { error } = await getSupabaseClient()
        .from('reminders')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', reminder.id)
        .eq('couple_id', coupleId)

      if (error) throw error
      const data = await fetchReminders()
      setReminders(data.reminders)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not dismiss the reminder.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="app-panel w-full max-w-3xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Reminders</h2>
        <p className="mt-1 text-slate-600">
          Schedule in-app reminders for shared dates and plans.
        </p>
      </div>

      {errorMessage && (
        <p className="mt-5 text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      )}

      <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={saveReminder}>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="reminder-title">
            Reminder
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            id="reminder-title"
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            required
            value={title}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="reminder-time">
            Remind me
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            id="reminder-time"
            onChange={(event) => setRemindAt(event.target.value)}
            required
            type="datetime-local"
            value={remindAt}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="reminder-occasion">
            Linked date (optional)
          </label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            id="reminder-occasion"
            onChange={(event) => setOccasionId(event.target.value)}
            value={occasionId}
          >
            <option value="">No linked date</option>
            {occasions.map((occasion) => (
              <option key={occasion.id} value={occasion.id}>
                {occasion.title}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <button
            className="rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            {saving ? 'Saving...' : 'Add reminder'}
          </button>
        </div>
      </form>

      <div className="mt-8">
        <h3 className="font-semibold text-slate-900">Scheduled reminders</h3>
        {loading ? (
          <p className="mt-3 text-sm text-slate-600">Loading reminders...</p>
        ) : reminders.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No reminders scheduled.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {reminders.map((reminder) => (
              <li className="list-row" key={reminder.id}>
                <p className="font-semibold text-slate-900">{reminder.title}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {formatDateTime(reminder.snoozed_until ?? reminder.remind_at)}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    disabled={saving}
                    onClick={() => void snoozeReminder(reminder)}
                    type="button"
                  >
                    Snooze 1 day
                  </button>
                  <button
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                    disabled={saving}
                    onClick={() => void dismissReminder(reminder)}
                    type="button"
                  >
                    Dismiss
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
