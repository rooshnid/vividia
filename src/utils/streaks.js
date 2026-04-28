export function getWeekdayKey(date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
}

export function getDaysBetween(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((endDate - startDate) / 86400000));
}

export function calculateStreak(completedDates) {
  if (!completedDates?.length) {
    return 0;
  }

  const unique = [...new Set(completedDates)].sort().reverse();
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (const isoDate of unique) {
    const current = new Date(isoDate);
    current.setHours(0, 0, 0, 0);

    if (current.getTime() === cursor.getTime()) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    if (streak === 0 && current.getTime() === cursor.getTime() - 86400000) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 2);
      continue;
    }

    break;
  }

  return streak;
}

export function getWeekCompletion(completedDates) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const set = new Set((completedDates || []).map((date) => getWeekdayKey(new Date(date))));
  return days.map((day) => ({ day, complete: set.has(day) }));
}
