import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { Database } from '../../lib/supabase/database.types'
import { getSupabaseClient } from '../../lib/supabase/client'
import { compressImage } from '../../lib/images/compressImage'

type Memory = Database['public']['Tables']['memories']['Row']
type MemoryType = Memory['memory_type']

interface MemoryBoardProps {
  coupleId: string
}

const memoryTypes: { value: MemoryType; label: string }[] = [
  { value: 'memory', label: 'Memory' },
  { value: 'place', label: 'Place' },
  { value: 'recipe', label: 'Recipe' },
  { value: 'trip', label: 'Trip' },
  { value: 'gift', label: 'Gift idea' },
  { value: 'other', label: 'Other' },
]

const memoryCardColors = [
  '#9f1239',
  '#9a3412',
  '#166534',
  '#1e40af',
  '#6b21a8',
  '#155e75',
  '#854d0e',
  '#334155',
]

function getMemoryCardColor(id: string) {
  let hash = 0
  for (const character of id) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }
  return memoryCardColors[hash % memoryCardColors.length]
}

function parseTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .map((tag) => tag.slice(0, 30)),
    ),
  ).slice(0, 12)
}

export function MemoryBoard({ coupleId }: MemoryBoardProps) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loadedCoupleId, setLoadedCoupleId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [memoryType, setMemoryType] = useState<MemoryType>('memory')
  const [memoryDate, setMemoryDate] = useState('')
  const [location, setLocation] = useState('')
  const [rating, setRating] = useState('')
  const [tags, setTags] = useState('')
  const [notes, setNotes] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [signedImageUrls, setSignedImageUrls] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const loading = loadedCoupleId !== coupleId

  const fetchMemories = useCallback(async () => {
    const { data, error } = await getSupabaseClient()
      .from('memories')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }, [coupleId])

  useEffect(() => {
    let active = true

    void fetchMemories()
      .then((data) => {
        if (active) {
          setMemories(data)
          setErrorMessage('')
          setLoadedCoupleId(coupleId)
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Could not load memories.',
          )
          setLoadedCoupleId(coupleId)
        }
      })

    return () => {
      active = false
    }
  }, [coupleId, fetchMemories])

  useEffect(() => {
    let active = true

    async function loadSignedUrls() {
      const entries = await Promise.all(
        memories
          .filter((memory) => memory.image_path)
          .map(async (memory) => {
            const { data, error } = await getSupabaseClient().storage
              .from('memory-images')
              .createSignedUrl(memory.image_path!, 3600)
            if (error) throw error
            return [memory.id, data.signedUrl] as const
          }),
      )

      if (active) {
        setSignedImageUrls(Object.fromEntries(entries))
      }
    }

    void loadSignedUrls()
      .then(() => {
        if (active) setErrorMessage('')
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Could not load a saved image.',
          )
        }
      })
    return () => {
      active = false
    }
  }, [memories])

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setMemoryType('memory')
    setMemoryDate('')
    setLocation('')
    setRating('')
    setTags('')
    setNotes('')
    setImageFile(null)
  }

  function beginEdit(memory: Memory) {
    setEditingId(memory.id)
    setTitle(memory.title)
    setMemoryType(memory.memory_type)
    setMemoryDate(memory.memory_date ?? '')
    setLocation(memory.location ?? '')
    setRating(memory.rating ? String(memory.rating) : '')
    setTags(memory.tags.join(', '))
    setNotes(memory.notes ?? '')
    setImageFile(null)
    setErrorMessage('')
  }

  async function saveMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')

    const values = {
      title: title.trim(),
      memory_type: memoryType,
      memory_date: memoryDate || null,
      location: location.trim() || null,
      rating: rating ? Number(rating) : null,
      tags: parseTags(tags),
      notes: notes.trim() || null,
    }

    try {
      const supabase = getSupabaseClient()
      const currentMemory = editingId
        ? memories.find((memory) => memory.id === editingId)
        : undefined
      const memoryId = editingId ?? crypto.randomUUID()
      let uploadedPath: string | null = null

      if (imageFile) {
        const compressed = await compressImage(imageFile)
        uploadedPath = `${coupleId}/${memoryId}-${crypto.randomUUID()}.webp`
        const upload = await supabase.storage
          .from('memory-images')
          .upload(uploadedPath, compressed, {
            cacheControl: '3600',
            contentType: 'image/webp',
            upsert: false,
          })
        if (upload.error) throw upload.error
      }

      const imagePath = uploadedPath ?? currentMemory?.image_path ?? null
      let saveError: Error | null
      if (editingId) {
        const { error } = await supabase
          .from('memories')
          .update({ ...values, image_path: imagePath })
          .eq('id', memoryId)
          .eq('couple_id', coupleId)
        saveError = error
      } else {
        const { error } = await supabase
          .from('memories')
          .insert({
            ...values,
            id: memoryId,
            couple_id: coupleId,
            image_path: imagePath,
          })
        saveError = error
      }

      if (saveError) {
        if (uploadedPath) {
          const { error: cleanupError } = await supabase.storage
            .from('memory-images')
            .remove([uploadedPath])
          if (cleanupError) {
            throw new Error(
              `${saveError.message} The uploaded image could not be cleaned up: ${cleanupError.message}`,
            )
          }
        }
        throw saveError
      }

      if (uploadedPath && currentMemory?.image_path) {
        const { error: cleanupError } = await supabase.storage
          .from('memory-images')
          .remove([currentMemory.image_path])
        if (cleanupError) {
          setErrorMessage(
            `Memory saved, but the previous image could not be removed: ${cleanupError.message}`,
          )
        }
      }
      setMemories(await fetchMemories())
      resetForm()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not save this memory.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteMemory(memory: Memory) {
    if (!window.confirm(`Delete "${memory.title}"?`)) return

    setSaving(true)
    setErrorMessage('')

    try {
      const { error } = await getSupabaseClient()
        .from('memories')
        .delete()
        .eq('id', memory.id)
        .eq('couple_id', coupleId)

      if (error) throw error
      if (memory.image_path) {
        const { error: storageError } = await getSupabaseClient().storage
          .from('memory-images')
          .remove([memory.image_path])
        if (storageError) {
          setErrorMessage(
            `Memory deleted, but its image could not be removed: ${storageError.message}`,
          )
        }
      }
      setMemories(await fetchMemories())
      if (editingId === memory.id) resetForm()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not delete this memory.',
      )
    } finally {
      setSaving(false)
    }
  }

  const visibleMemories = memories.filter((memory) => {
    const term = search.trim().toLowerCase()
    if (!term) return true

    return [
      memory.title,
      memory.location,
      memory.notes,
      ...memory.tags,
    ]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(term))
  })

  return (
    <section className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Memories and saved information</h2>
        <p className="mt-1 text-slate-600">
          Save places, recipes, trips, gift ideas, and moments you want to remember.
        </p>
      </div>

      {errorMessage && (
        <p className="mt-5 text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      )}

      <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={saveMemory}>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="memory-title">
            Title
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            id="memory-title"
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            required
            value={title}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="memory-type">
            Type
          </label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            id="memory-type"
            onChange={(event) => {
              const next = memoryTypes.find((option) => option.value === event.target.value)
              if (next) setMemoryType(next.value)
            }}
            value={memoryType}
          >
            {memoryTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="memory-date">
            Date (optional)
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            id="memory-date"
            onChange={(event) => setMemoryDate(event.target.value)}
            type="date"
            value={memoryDate}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="memory-location">
            Location (optional)
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            id="memory-location"
            maxLength={160}
            onChange={(event) => setLocation(event.target.value)}
            value={location}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="memory-rating">
            Rating (optional)
          </label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            id="memory-rating"
            onChange={(event) => setRating(event.target.value)}
            value={rating}
          >
            <option value="">No rating</option>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value} star{value === 1 ? '' : 's'}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="memory-tags">
            Tags (optional, separated by commas)
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            id="memory-tags"
            onChange={(event) => setTags(event.target.value)}
            placeholder="romantic, favorite, weekend"
            value={tags}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="memory-image">
            Image (optional, JPEG, PNG, or WebP)
          </label>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="mt-1 block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-rose-50 file:px-3 file:py-2 file:font-semibold file:text-rose-700"
            id="memory-image"
            onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
            type="file"
          />
          <p className="mt-1 text-xs text-slate-500">
            Maximum 5 MB. The app compresses it before upload.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="memory-notes">
            Notes (optional)
          </label>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            id="memory-notes"
            maxLength={2000}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            value={notes}
          />
        </div>

        <div className="flex gap-3 sm:col-span-2">
          <button
            className="rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add memory'}
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h3 className="font-semibold text-slate-900">Saved items</h3>
          <div className="sm:w-64">
            <label className="block text-xs font-medium text-slate-700" htmlFor="memory-search">
              Search
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
              id="memory-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Title, location, tag..."
              value={search}
            />
          </div>
        </div>

        {loading ? (
          <p className="mt-3 text-sm text-slate-600">Loading memories…</p>
        ) : visibleMemories.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            {search ? 'No saved items match your search.' : 'No memories saved yet.'}
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleMemories.map((memory) => (
              <li
                className="flex min-h-72 flex-col justify-between overflow-hidden rounded-2xl bg-cover bg-center p-4 text-white shadow-sm ring-1 ring-black/10"
                key={memory.id}
                style={{
                  backgroundColor: getMemoryCardColor(memory.id),
                  backgroundImage: signedImageUrls[memory.id]
                    ? `linear-gradient(180deg, rgba(15, 23, 42, 0.08) 0%, rgba(15, 23, 42, 0.88) 100%), url("${signedImageUrls[memory.id]}")`
                    : 'linear-gradient(180deg, rgba(15, 23, 42, 0.08) 0%, rgba(15, 23, 42, 0.72) 100%)',
                }}
              >
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-white drop-shadow-sm">{memory.title}</p>
                  <p className="mt-1 text-sm text-white/90">
                    {memoryTypes.find((option) => option.value === memory.memory_type)?.label}
                    {memory.location && ` · ${memory.location}`}
                    {memory.memory_date && ` · ${memory.memory_date}`}
                    {memory.rating && ` · ${memory.rating}/5`}
                  </p>
                  {memory.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {memory.tags.map((tag) => (
                        <span
                          className="rounded-full bg-white/20 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm"
                          key={tag}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {memory.notes && (
                    <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm text-white/90">
                      {memory.notes}
                    </p>
                  )}
                  {memory.image_path && signedImageUrls[memory.id] && (
                    <a
                      className="mt-3 inline-block text-sm font-semibold text-white underline decoration-white/60 underline-offset-2 hover:decoration-white"
                      href={signedImageUrls[memory.id]}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open image
                    </a>
                  )}
                </div>
                <div className="mt-5 flex shrink-0 gap-2">
                  <button
                    className="rounded-lg border border-white/40 bg-black/20 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-black/35"
                    onClick={() => beginEdit(memory)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-lg border border-white/40 bg-black/20 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-black/35 disabled:opacity-60"
                    disabled={saving}
                    onClick={() => void deleteMemory(memory)}
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
