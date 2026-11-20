import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardPanel } from './DashboardPanel'

const from = vi.hoisted(() => vi.fn())

interface QueryResult {
  data: unknown[]
  error: null
}

interface MockQuery extends PromiseLike<QueryResult> {
  select: () => MockQuery
  eq: () => MockQuery
  order: () => MockQuery
  limit: () => MockQuery
}

function createQuery(data: unknown[]): MockQuery {
  const query: MockQuery = {
    select: () => query,
    eq: () => query,
    order: () => query,
    limit: () => query,
    then: (onfulfilled, onrejected) =>
      Promise.resolve({ data, error: null }).then(onfulfilled, onrejected),
  }
  return query
}

vi.mock('../../lib/supabase/client', () => ({
  getSupabaseClient: () => ({ from }),
}))

describe('DashboardPanel', () => {
  let occasions: unknown[]

  beforeEach(() => {
    occasions = []
    from.mockImplementation((table: string) =>
      createQuery(table === 'occasions' ? occasions : []),
    )
  })

  it('shows empty dashboard states', async () => {
    render(<DashboardPanel coupleId="couple-id" />)

    await waitFor(() => {
      expect(screen.getByText('No upcoming dates.')).toBeInTheDocument()
    })
    expect(screen.getByText('Nothing planned yet.')).toBeInTheDocument()
    expect(screen.getByText('No memories saved yet.')).toBeInTheDocument()
  })

  it('shows the next occurrence of yearly dates and hides past one-time dates', async () => {
    const today = new Date()
    const nextDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3)
    const pastDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
    const toDateString = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate(),
      ).padStart(2, '0')}`

    occasions = [
      {
        id: 'yearly',
        title: 'Anniversary',
        occasion_date: `2010-${toDateString(nextDate).slice(5)}`,
        repeats_yearly: true,
      },
      {
        id: 'past',
        title: 'Past event',
        occasion_date: toDateString(pastDate),
        repeats_yearly: false,
      },
    ]

    render(<DashboardPanel coupleId="couple-id" />)

    await waitFor(() => {
      expect(screen.getByText('Anniversary')).toBeInTheDocument()
    })
    expect(screen.queryByText('Past event')).not.toBeInTheDocument()
  })
})
