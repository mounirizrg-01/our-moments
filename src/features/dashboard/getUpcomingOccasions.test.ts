import { describe, expect, it } from 'vitest'
import { getUpcomingOccasions } from './getUpcomingOccasions'

describe('getUpcomingOccasions', () => {
  it('moves a past yearly occasion to next year', () => {
    const result = getUpcomingOccasions(
      [{ occasion_date: '2020-01-10', repeats_yearly: true }],
      new Date(2026, 5, 20),
    )

    expect(result[0].nextDate.getFullYear()).toBe(2027)
  })

  it('sorts upcoming occasions by date', () => {
    const result = getUpcomingOccasions(
      [
        { occasion_date: '2026-12-10', repeats_yearly: false },
        { occasion_date: '2026-06-25', repeats_yearly: false },
      ],
      new Date(2026, 5, 20),
    )

    expect(result.map(({ occasion }) => occasion.occasion_date)).toEqual([
      '2026-06-25',
      '2026-12-10',
    ])
  })
})
