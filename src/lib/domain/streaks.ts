import { addDaysToDateKey, firstStreakDateKey } from "./time";

export type StreakEntry = {
  localDate: string;
  status: "PENDING" | "COUNTED" | "MISSED";
};

export function shouldStartStreak(input: {
  onboardingCompletedAt: Date | null;
  timezone: string;
  localDate: string;
}) {
  if (!input.onboardingCompletedAt) return false;
  return input.localDate >= firstStreakDateKey(input.onboardingCompletedAt, input.timezone);
}

export function calculateStreak(entries: StreakEntry[], throughDate: string) {
  const byDate = new Map(entries.map((entry) => [entry.localDate, entry.status]));
  let cursor = throughDate;
  let current = 0;

  while (byDate.get(cursor) === "COUNTED") {
    current += 1;
    cursor = addDaysToDateKey(cursor, -1);
  }

  let longest = 0;
  let run = 0;
  for (const entry of [...entries].sort((a, b) => a.localDate.localeCompare(b.localDate))) {
    if (entry.status === "COUNTED") {
      run += 1;
      longest = Math.max(longest, run);
    } else if (entry.status === "MISSED") {
      run = 0;
    }
  }

  return { current, longest };
}

export function streakMilestones(streak: number) {
  return {
    week: streak >= 7,
    month: streak >= 30,
    quarter: streak >= 90,
    label: streak >= 90 ? "90 day" : streak >= 30 ? "1 month" : streak >= 7 ? "1 week" : "warming up",
  };
}
