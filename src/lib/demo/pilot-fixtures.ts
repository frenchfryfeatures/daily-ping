export type PilotProfile = {
  displayName: string;
  firstName: string;
  phone: string;
  city: string;
  region: string;
  country: string;
  timezone: string;
  preferredSendTime: string;
  languageCode: string;
  languageName: string;
  zodiacSign: string;
  numerologyNumber: number;
  marketPreference: string;
  tonePreference: string;
  interests: string[];
  tags: string[];
  status: "ACTIVE" | "PAUSED" | "OPTED_OUT" | "ADMIN_HOLD" | "ONBOARDING";
  streakDays: number;
};

const baseProfiles: Omit<PilotProfile, "phone" | "preferredSendTime" | "status" | "streakDays">[] = [
  {
    displayName: "Aarav Mehta",
    firstName: "Aarav",
    city: "Mumbai",
    region: "Maharashtra",
    country: "India",
    timezone: "Asia/Kolkata",
    languageCode: "en",
    languageName: "English",
    zodiacSign: "Virgo",
    numerologyNumber: 5,
    marketPreference: "NIFTY 50",
    tonePreference: "warm",
    interests: ["family", "fitness", "markets"],
    tags: ["founder-circle", "voice-curious"],
  },
  {
    displayName: "Nisha Iyer",
    firstName: "Nisha",
    city: "Bengaluru",
    region: "Karnataka",
    country: "India",
    timezone: "Asia/Kolkata",
    languageCode: "hi",
    languageName: "Hindi",
    zodiacSign: "Libra",
    numerologyNumber: 2,
    marketPreference: "SENSEX",
    tonePreference: "gentle",
    interests: ["mindfulness", "parents", "career"],
    tags: ["hindi-pilot"],
  },
  {
    displayName: "Kabir Sharma",
    firstName: "Kabir",
    city: "Delhi",
    region: "Delhi",
    country: "India",
    timezone: "Asia/Kolkata",
    languageCode: "en",
    languageName: "English",
    zodiacSign: "Aries",
    numerologyNumber: 9,
    marketPreference: "NIFTY Bank",
    tonePreference: "energetic",
    interests: ["business", "service", "learning"],
    tags: ["markets-heavy"],
  },
  {
    displayName: "Meera Patel",
    firstName: "Meera",
    city: "Ahmedabad",
    region: "Gujarat",
    country: "India",
    timezone: "Asia/Kolkata",
    languageCode: "gu",
    languageName: "Gujarati",
    zodiacSign: "Taurus",
    numerologyNumber: 6,
    marketPreference: "GIFT Nifty",
    tonePreference: "devotional",
    interests: ["family", "community", "food"],
    tags: ["regional-language"],
  },
  {
    displayName: "Rohan Kapoor",
    firstName: "Rohan",
    city: "London",
    region: "England",
    country: "United Kingdom",
    timezone: "Europe/London",
    languageCode: "en",
    languageName: "English",
    zodiacSign: "Gemini",
    numerologyNumber: 3,
    marketPreference: "FTSE 100",
    tonePreference: "practical",
    interests: ["diaspora", "career", "parents"],
    tags: ["global-timezone"],
  },
  {
    displayName: "Priya Menon",
    firstName: "Priya",
    city: "Singapore",
    region: "Singapore",
    country: "Singapore",
    timezone: "Asia/Singapore",
    languageCode: "en",
    languageName: "English",
    zodiacSign: "Cancer",
    numerologyNumber: 7,
    marketPreference: "STI",
    tonePreference: "calm",
    interests: ["wellness", "work", "gratitude"],
    tags: ["global-timezone", "retention-watch"],
  },
];

const statuses: PilotProfile["status"][] = [
  "ACTIVE",
  "ACTIVE",
  "ACTIVE",
  "ACTIVE",
  "ACTIVE",
  "PAUSED",
  "ADMIN_HOLD",
  "OPTED_OUT",
  "ONBOARDING",
];

const sendTimes = ["06:45", "07:00", "07:15", "07:30", "08:00", "08:30"];

export function buildPilotProfiles(count = 36): PilotProfile[] {
  return Array.from({ length: count }, (_, index) => {
    const base = baseProfiles[index % baseProfiles.length];
    const status = statuses[index % statuses.length];
    const phoneSuffix = (8800001000 + index).toString();

    return {
      ...base,
      displayName: index < baseProfiles.length ? base.displayName : `${base.firstName} ${index + 1}`,
      phone: `+91${phoneSuffix}`,
      preferredSendTime: sendTimes[index % sendTimes.length],
      status,
      streakDays: status === "ONBOARDING" ? 0 : [2, 5, 7, 14, 30, 45, 0, 0, 0][index % statuses.length],
    };
  });
}

export const contentLibrary = [
  {
    category: "AFFIRMATION",
    title: "Universe support",
    body: "Universe is with you, and something good is moving toward you soon.",
    tags: ["warm", "hope"],
  },
  {
    category: "AFFIRMATION",
    title: "Olive branch",
    body: "Today is a good day to extend an olive branch and turn a stranger into a future friend.",
    tags: ["social", "kindness"],
  },
  {
    category: "KINDNESS_TASK",
    title: "Water offer",
    body: "Offer a glass or bottle of water to two people who may need it today.",
    tags: ["service", "simple"],
  },
  {
    category: "KINDNESS_TASK",
    title: "Old friend call",
    body: "Call one friend you have not spoken to recently and ask how they are without rushing the answer.",
    tags: ["friendship", "connection"],
  },
  {
    category: "POSITIVE_NEWS_FALLBACK",
    title: "Community learning",
    body: "Local volunteers are helping students, seniors, and working families with small practical acts of support.",
    tags: ["fallback", "community"],
  },
] as const;

export const positiveNewsFixtures = [
  {
    scope: "regional",
    title: "Neighborhood reading corners grow after school",
    summary: "Volunteers and teachers are helping children discover books in safe local spaces.",
    sourceName: "Pilot Positive Desk",
    sentimentScore: 0.78,
  },
  {
    scope: "country",
    title: "Small solar labs train young makers",
    summary: "Community teams are helping students learn practical clean-energy skills.",
    sourceName: "Pilot Positive Desk",
    sentimentScore: 0.74,
  },
  {
    scope: "country",
    title: "Fraud case creates political fight",
    summary: "A negative public dispute expands.",
    sourceName: "Rejected Desk",
    sentimentScore: 0.9,
  },
] as const;
