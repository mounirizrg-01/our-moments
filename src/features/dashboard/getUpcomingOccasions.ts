export interface OccasionDate {
  occasion_date: string
  repeats_yearly: boolean
}

export function getUpcomingOccasions(
  occasions: OccasionDate[],
  today = new Date(),
  limit = 5,
) {
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  return occasions
    .map((occasion) => {
      const [year, month, day] = occasion.occasion_date.split('-').map(Number)
      let nextDate = new Date(year, month - 1, day)

      if (occasion.repeats_yearly) {
        nextDate = new Date(today.getFullYear(), month - 1, day)
        if (nextDate < startOfToday) {
          nextDate = new Date(today.getFullYear() + 1, month - 1, day)
        }
      }

      return { occasion, nextDate }
    })
    .filter(({ nextDate }) => nextDate >= startOfToday)
    .sort((left, right) => left.nextDate.getTime() - right.nextDate.getTime())
    .slice(0, limit)
}
