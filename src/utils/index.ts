/**
 * Returns whether a date falls on a working day (Mon–Fri).
 */
export const isWorkingDay = (date: Date): boolean => {
  const day = date.getDay();
  return day >= 1 && day <= 5;
};

/**
 * Returns the last day of the month for a given date.
 */
export const getLastDayOfMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

/**
 * Starting from the last calendar day of the month, counts back N working days
 * to find the trigger date. If that date itself falls on a weekend, moves it
 * earlier to the preceding Friday.
 *
 * @returns The calendar date (day of month) the script should run on.
 *
 * Example: March 2026 ends on Tue 31st.
 *   Working days from the end: 31(Tue)=1, 30(Mon)=2, 27(Fri)=3, 26(Thu)=4 …
 *   With daysBefore=4 → trigger date is the 26th.
 */
export const getTriggerDate = (
  year: number,
  month: number,
  workingDaysBefore: number,
): number => {
  const lastDay = new Date(year, month, 0); // last calendar day of month
  let counted = 0;
  const cursor = new Date(lastDay);

  // Walk backwards counting working days
  while (counted < workingDaysBefore) {
    if (isWorkingDay(cursor)) {
      counted++;
    }
    if (counted < workingDaysBefore) {
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  // cursor is now the Nth working day from the end.
  // If it somehow isn't a working day (shouldn't happen), shift earlier.
  while (!isWorkingDay(cursor)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  return cursor.getDate();
};

/**
 * Returns the calendar day (day of month) that is one working day before
 * the trigger date. Used to send a reminder notification.
 */
export const getReminderDate = (
  year: number,
  month: number,
  workingDaysBefore: number,
): number => {
  const triggerDay = getTriggerDate(year, month, workingDaysBefore);
  const cursor = new Date(year, month - 1, triggerDay);

  // Step back one calendar day at a time until we land on a working day
  do {
    cursor.setDate(cursor.getDate() - 1);
  } while (!isWorkingDay(cursor));

  return cursor.getDate();
};
