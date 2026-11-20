import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '../../lib/supabase/database.types'
import { MemoryBoard } from './MemoryBoard'

type Memory = Database['public']['Tables']['memories']['Row']

const supabase = vi.hoisted(() => ({
  from: vi.fn(),
  storageFrom: vi.fn(),
}))

vi.mock('../../lib/supabase/client', () => ({
  getSupabaseClient: () => ({
    ...supabase,
    storage: { from: supabase.storageFrom },
  }),
}))

vi.mock('../../lib/images/compressImage', () => ({
  compressImage: vi.fn(async () => new Blob(['compressed'], { type: 'image/webp' })),
  MAX_IMAGE_BYTES: 5 * 1024 * 1024,
}))

function makeMutationBuilder(result: { error: Error | null }) {
  const builder = {
    eq: vi.fn(),
    then: (onFulfilled: (value: typeof result) => unknown) =>
      Promise.resolve(result).then(onFulfilled),
  }
  builder.eq.mockReturnValue(builder)
  return builder
}

function makeMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: 'memory-id',
    couple_id: 'couple-id',
    title: 'Lake day',
    memory_type: 'trip',
    memory_date: '2026-08-10',
    location: 'Lake Como',
    rating: 5,
    tags: ['summer', 'favorite'],
    notes: 'A perfect afternoon.',
    image_path: null,
    created_by: 'user-id',
    created_at: '2026-11-19T00:00:00.000Z',
    updated_at: '2026-11-19T00:00:00.000Z',
    ...overrides,
  }
}

describe('MemoryBoard', () => {
  const query = {
    delete: vi.fn(),
    eq: vi.fn(),
    insert: vi.fn(),
    order: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  }
  const storageBucket = {
    createSignedUrl: vi.fn(),
    remove: vi.fn(),
    upload: vi.fn(),
  }

  beforeEach(() => {
    query.select.mockReturnThis()
    query.eq.mockReturnThis()
    query.order.mockResolvedValue({ data: [], error: null })
    query.insert.mockResolvedValue({ error: null })
    query.update.mockReturnValue(makeMutationBuilder({ error: null }))
    query.delete.mockReturnValue(makeMutationBuilder({ error: null }))
    storageBucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://example.supabase.co/signed-image' },
      error: null,
    })
    storageBucket.remove.mockResolvedValue({ error: null })
    storageBucket.upload.mockResolvedValue({ error: null })
    supabase.storageFrom.mockReset().mockReturnValue(storageBucket)
    supabase.from.mockReset().mockReturnValue(query)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a tagged memory scoped to the current couple', async () => {
    render(<MemoryBoard coupleId="couple-id" />)

    fireEvent.change(await screen.findByLabelText('Title'), {
      target: { value: 'Lake day' },
    })
    fireEvent.change(screen.getByLabelText('Type'), {
      target: { value: 'trip' },
    })
    fireEvent.change(screen.getByLabelText('Location (optional)'), {
      target: { value: 'Lake Como' },
    })
    fireEvent.change(screen.getByLabelText('Rating (optional)'), {
      target: { value: '5' },
    })
    fireEvent.change(screen.getByLabelText('Tags (optional, separated by commas)'), {
      target: { value: 'summer, favorite, summer' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add memory' }))

    await waitFor(() => {
      expect(query.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          couple_id: 'couple-id',
          title: 'Lake day',
          memory_type: 'trip',
          location: 'Lake Como',
          rating: 5,
          tags: ['summer', 'favorite'],
          notes: null,
        }),
      )
    })
  })

  it('filters saved memories through the search field', async () => {
    query.order.mockResolvedValue({
      data: [makeMemory()],
      error: null,
    })
    render(<MemoryBoard coupleId="couple-id" />)

    fireEvent.change(await screen.findByLabelText('Search'), {
      target: { value: 'favorite' },
    })

    expect(screen.getByText('Lake day')).toBeInTheDocument()
  })

  it('uses uploaded photos as card backgrounds and colors cards without photos', async () => {
    query.order.mockResolvedValue({
      data: [
        makeMemory({ id: 'memory-with-image', image_path: 'couple-id/photo.webp' }),
        makeMemory({ id: 'memory-without-image', title: 'Coffee date', image_path: null }),
      ],
      error: null,
    })
    render(<MemoryBoard coupleId="couple-id" />)

    await waitFor(() => {
      expect(storageBucket.createSignedUrl).toHaveBeenCalledWith(
        'couple-id/photo.webp',
        3600,
      )
    })

    const photoCard = screen.getByText('Lake day').closest('li')
    const colorCard = screen.getByText('Coffee date').closest('li')
    expect(photoCard).toHaveStyle(
      'background-image: linear-gradient(180deg, rgba(15, 23, 42, 0.08) 0%, rgba(15, 23, 42, 0.88) 100%), url("https://example.supabase.co/signed-image")',
    )
    expect(colorCard?.style.backgroundColor).toMatch(/^rgb\(/)
    expect(colorCard?.style.backgroundImage).toContain('linear-gradient')
  })

  it('shows database errors instead of hiding them', async () => {
    query.order.mockResolvedValue({
      data: null,
      error: new Error('Could not read memories'),
    })
    render(<MemoryBoard coupleId="couple-id" />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not read memories')
  })

  it('offers a 5 MB image upload instead of an external image link', async () => {
    render(<MemoryBoard coupleId="couple-id" />)

    const upload = await screen.findByLabelText(
      'Image (optional, JPEG, PNG, or WebP)',
    )
    expect(upload).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
    expect(screen.queryByLabelText('HTTPS image link (optional)')).not.toBeInTheDocument()
  })

  it('uploads the image privately and stores its object path with the memory', async () => {
    const file = new File(['image'], 'lake.png', { type: 'image/png' })
    render(<MemoryBoard coupleId="couple-id" />)

    fireEvent.change(await screen.findByLabelText('Title'), {
      target: { value: 'Lake day' },
    })
    fireEvent.change(screen.getByLabelText('Image (optional, JPEG, PNG, or WebP)'), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add memory' }))

    await waitFor(() => {
      expect(storageBucket.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^couple-id\/.+\.webp$/),
        expect.any(Blob),
        expect.objectContaining({ contentType: 'image/webp', upsert: false }),
      )
      expect(query.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          couple_id: 'couple-id',
          title: 'Lake day',
          image_path: expect.stringMatching(/^couple-id\/.+\.webp$/),
        }),
      )
    })
  })
})
