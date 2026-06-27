export type LocalParts = {
  dateKey: string;
  hour: number;
  minute: number;
};

function getParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function getLocalParts(date: Date, timezone: string): LocalParts {
  const parts = getParts(date, timezone);
  const hour = Number(parts.hour === "24" ? "0" : parts.hour);

  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    hour,
    minute: Number(parts.minute),
  };
}

export function getLocalWeekdayName(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  }).format(date);
}

export function minutesFromTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid HH:mm time: ${value}`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new Error(`Invalid HH:mm time: ${value}`);
  return hours * 60 + minutes;
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function firstStreakDateKey(completedAt: Date, timezone: string) {
  return addDaysToDateKey(getLocalParts(completedAt, timezone).dateKey, 1);
}

export function isWithinDispatchWindow(input: {
  now: Date;
  timezone: string;
  preferredSendTime: string;
  windowMinutes?: number;
}) {
  const windowMinutes = input.windowMinutes ?? 15;
  const local = getLocalParts(input.now, input.timezone);
  const localMinute = local.hour * 60 + local.minute;
  const preferredMinute = minutesFromTime(input.preferredSendTime);

  return {
    dateKey: local.dateKey,
    due: localMinute >= preferredMinute && localMinute < preferredMinute + windowMinutes,
    localMinute,
    preferredMinute,
  };
}

export function dailyTextIdempotencyKey(userId: string, localDate: string) {
  return `daily-text:${userId}:${localDate}`;
}

export function dailyNudgeIdempotencyKey(userId: string, localDate: string) {
  return `daily-nudge:${userId}:${localDate}`;
}

export function voiceIdempotencyKey(userId: string, briefId: string) {
  return `voice:${userId}:${briefId}`;
}
