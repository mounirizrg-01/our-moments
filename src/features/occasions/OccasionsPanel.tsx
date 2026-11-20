import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { Database } from '../../lib/supabase/database.types'
import { getSupabaseClient } from '../../lib/supabase/client'

type Occasion = Database['public']['Tables']['occasions']['Row']
type OccasionCategory = Occasion['category']

interface OccasionsPanelProps {
  coupleId: string
}

const categories: { value: OccasionCategory; label: string }[] = [
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'reservation', label: 'Reservation' },
  { value: 'other', label: 'Other' },
]

function formatDate(value: string, repeatsYearly: boolean) {
  const [year, month, day] = value.split('-').map(Number)

  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    ...(repeatsYearly ? {} : { year: 'numeric' as const }),
  }).format(new Date(year, month - 1, day))
}

export function OccasionsPanel({ coupleId }: OccasionsPanelProps) {
  const [occasions, setOccasions] = useState<Occasion[]>([])
  const [loadedCoupleId, setLoadedCoupleId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [category, setCategory] = useState<OccasionCategory>('other')
  const [repeatsYearly, setRepeatsYearly] = useState(false)
  const [notes, setNotes] = useState('')
  const loading = loadedCoupleId !== coupleId

  const fetchOccasions = useCallback(async () => {
    const { data, error } = await getSupabaseClient()
      .from('occasions')
      .select('*')
      .eq('couple_id', coupleId)
      .order('occasion_date', { ascending: true })

    if (error) throw error
    return data
  }, [coupleId])

  useEffect(() => {
    let active = true

    void fetchOccasions()
      .then((data) => {
        if (active) {
          setOccasions(data)
          setErrorMessage('')
          setLoadedCoupleId(coupleId)
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Could not load important dates.',
          )
          setLoadedCoupleId(coupleId)
        }
      })

    return () => {
      active = false
    }
  }, [coupleId, fetchOccasions])

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setDate('')
    setCategory('other')
    setRepeatsYearly(false)
    setNotes('')
  }

  function beginEdit(occasion: Occasion) {
    setEditingId(occasion.id)
    setTitle(occasion.title)
    setDate(occasion.occasion_date)
    setCategory(occasion.category)
    setRepeatsYearly(occasion.repeats_yearly)
    setNotes(occasion.notes ?? '')
    setErrorMessage('')
  }

  async function saveOccasion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')

    const values = {
      title: title.trim(),
      occasion_date: date,
      category,
      repeats_yearly: repeatsYearly,
      notes: notes.trim() || null,
    }

    try {
      const supabase = getSupabaseClient()
      const result = editingId
        ? await supabase
            .from('occasions')
            .update(values)
            .eq('id', editingId)
            .eq('couple_id', coupleId)
        : await supabase.from('occasions').insert({ ...values, couple_id: coupleId })

      if (result.error) throw result.error
      setOccasions(await fetchOccasions())
      resetForm()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not save this important date.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteOccasion(occasion: Occasion) {
    if (!window.confirm(`Delete "${occasion.title}"?`)) return

    setSaving(true)
    setErrorMessage('')

    try {
      const { error } = await getSupabaseClient()
        .from('occasions')
        .delete()
        .eq('id', occasion.id)
        .eq('couple_id', coupleId)

      if (error) throw error
      setOccasions(await fetchOccasions())
      if (editingId === occasion.id) resetForm()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not delete this important date.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="app-panel w-full max-w-3xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Important dates</h2>
        <p className="mt-1 text-slate-600">
          Keep birthdays, anniversaries, and plans in one shared list.
        </p>
      </div>

      {errorMessage && (
        <p className="mt-5 text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      )}

      <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={saveOccasion}>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="occasion-title">
            Title
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            id="occasion-title"
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            required
            value={title}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="occasion-date">
            Date
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            id="occasion-date"
            onChange={(event) => setDate(event.target.value)}
            required
            type="date"
            value={date}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="occasion-category">
            Category
          </label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            id="occasion-category"
            onChange={(event) => {
              const nextCategory = categories.find(
                (option) => option.value === event.target.value,
              )
              if (nextCategory) setCategory(nextCategory.value)
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

        <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
          <input
            checked={repeatsYearly}
            onChange={(event) => setRepeatsYearly(event.target.checked)}
            type="checkbox"
          />
          Repeats every year
        </label>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="occasion-notes">
            Notes (optional)
          </label>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            id="occasion-notes"
            maxLength={1000}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            value={notes}
          />
        </div>

        <div className="flex gap-3 sm:col-span-2">
          <button
            className="rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add date'}
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
        <h3 className="font-semibold text-slate-900">Your dates</h3>
        {loading ? (
          <p className="mt-3 text-sm text-slate-600">Loading dates…</p>
        ) : occasions.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No dates saved yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {occasions.map((occasion) => (
              <li
                className="list-row flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                key={occasion.id}
              >
                <div>
                  <p className="font-semibold text-slate-900">{occasion.title}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatDate(occasion.occasion_date, occasion.repeats_yearly)}
                    {occasion.repeats_yearly && ' · Repeats yearly'}
                    {' · '}
                    {categories.find((option) => option.value === occasion.category)?.label}
                  </p>
                  {occasion.notes && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                      {occasion.notes}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => beginEdit(occasion)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                    disabled={saving}
                    onClick={() => void deleteOccasion(occasion)}
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
