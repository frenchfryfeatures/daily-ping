import { positiveNewsFixtures, type PilotProfile } from "../demo/pilot-fixtures";
import type { BriefSourceData, BriefUser } from "./brief";

const colors = ["Emerald", "Saffron", "Sky blue", "Pearl white", "Rose", "Teal"];
const kindnessTasks = [
  "Offer a glass or bottle of water to two people who may need it today.",
  "Call one friend you have not spoken to recently and ask how they are without rushing the answer.",
  "Send a sincere thank-you note to someone whose effort usually goes unnoticed.",
  "Help one person complete a small task before you focus on your own next item.",
];
const affirmations = [
  "Universe is with you, and something good is moving toward you soon.",
  "Today can become lighter when you choose one honest, helpful action at a time.",
  "You do not need to force the day; meet it with patience and let progress find you.",
];

function seedFromText(value: string) {
  return [...value].reduce((total, char) => total + char.charCodeAt(0), 0);
}

export function profileToBriefUser(profile: PilotProfile): BriefUser {
  return {
    displayName: profile.displayName,
    city: profile.city,
    region: profile.region,
    country: profile.country,
    languageCode: profile.languageCode,
    zodiacSign: profile.zodiacSign,
    numerologyNumber: profile.numerologyNumber,
    marketPreference: profile.marketPreference,
    tonePreference: profile.tonePreference,
  };
}

export function buildSourceData(user: BriefUser, localDate: string): BriefSourceData {
  const seed = seedFromText(`${user.displayName}:${localDate}:${user.city}`);
  const rainChancePercent = 10 + (seed % 55);
  const temperatureC = 22 + (seed % 12);
  const luckyNumber = 1 + (seed % 9);
  const color = colors[seed % colors.length];
  const marketChange = ((seed % 120) - 35) / 100;
  const tone = marketChange > 0.15 ? "up" : marketChange < -0.15 ? "down" : "flat";

  return {
    localDate,
    weather: {
      summary: rainChancePercent > 45 ? "soft clouds with a light-rain watch" : "clear morning light with mild clouds",
      temperatureC,
      rainChancePercent,
    },
    market: {
      indexName: user.marketPreference,
      changePercent: marketChange,
      tone,
    },
    goldSilver: {
      goldInrPer10g: 72000 + (seed % 1800),
      silverInrPerKg: 89000 + (seed % 3200),
    },
    zodiac: {
      sign: user.zodiacSign || "Sun sign",
      note: "patient conversations, thoughtful timing, and one useful decision.",
    },
    numerology: {
      number: user.numerologyNumber || luckyNumber,
      note: "movement, learning, and a flexible plan.",
    },
    luckySignals: {
      color,
      number: luckyNumber,
    },
    powerHours: ["08:10-09:20", "17:30-18:15"],
    news: positiveNewsFixtures.map((item) => ({ ...item })),
    affirmation: affirmations[seed % affirmations.length],
    kindnessTask: kindnessTasks[seed % kindnessTasks.length],
  };
}
