import { createHash } from "crypto";

export type BriefUser = {
  displayName: string;
  city: string;
  region?: string | null;
  country: string;
  languageCode: string;
  zodiacSign?: string | null;
  numerologyNumber?: number | null;
  marketPreference: string;
  tonePreference: string;
};

export type NewsItem = {
  scope: "regional" | "country";
  title: string;
  summary: string;
  sourceName: string;
  sentimentScore: number;
  category?: string;
};

export type BriefSourceData = {
  localDate: string;
  weather: {
    summary: string;
    temperatureC: number;
    rainChancePercent: number;
  };
  market: {
    indexName: string;
    changePercent: number;
    tone: "up" | "flat" | "down";
  };
  goldSilver: {
    goldInrPer10g: number;
    silverInrPerKg: number;
  };
  zodiac: {
    sign: string;
    note: string;
  };
  numerology: {
    number: number;
    note: string;
  };
  luckySignals: {
    color: string;
    number: number;
  };
  powerHours: string[];
  news: NewsItem[];
  affirmation: string;
  kindnessTask: string;
};

const rejectedTerms = [
  "accident",
  "attack",
  "blast",
  "bomb",
  "case",
  "collapse",
  "crime",
  "crisis",
  "death",
  "died",
  "disease",
  "dispute",
  "earthquake",
  "election",
  "explosion",
  "fraud",
  "hate",
  "injured",
  "killed",
  "lawsuit",
  "murder",
  "political",
  "protest",
  "scam",
  "suicide",
  "terror",
  "violence",
  "war",
  "हत्या",
  "मौत",
  "धोखा",
  "राजनीति",
  "युद्ध",
];

function clipText(value: string, maxCharacters: number) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxCharacters) return compact;
  return `${compact.slice(0, Math.max(0, maxCharacters - 1)).trimEnd()}…`;
}

export function filterPositiveNews(items: NewsItem[]) {
  const safe = items.filter((item) => {
    const text = `${item.title} ${item.summary} ${item.category ?? ""}`.toLowerCase();
    return item.sentimentScore >= 0.35 && item.sentimentScore <= 1 && !rejectedTerms.some((term) => text.includes(term));
  });

  const regional = safe.find((item) => item.scope === "regional");
  const country = safe.find((item) => item.scope === "country");

  return [regional, country].filter(Boolean) as NewsItem[];
}

export function positiveNewsFallback(user: BriefUser): NewsItem[] {
  return [
    {
      scope: "regional",
      title: `${user.city} kindness circle`,
      summary: `Community volunteers in ${user.city} are creating small moments of support through food, water, learning, and neighborhood help.`,
      sourceName: "Daily Ping fallback library",
      sentimentScore: 0.8,
    },
    {
      scope: "country",
      title: `${user.country} progress note`,
      summary: `Across ${user.country}, local makers, teachers, students, and service teams continue building useful things quietly and consistently.`,
      sourceName: "Daily Ping fallback library",
      sentimentScore: 0.78,
    },
  ];
}

export function selectPositiveNews(user: BriefUser, items: NewsItem[]) {
  const filtered = filterPositiveNews(items);
  if (filtered.length >= 2) return filtered.slice(0, 2);
  return positiveNewsFallback(user);
}

export function composeDailyBrief(user: BriefUser, data: BriefSourceData) {
  const news = selectPositiveNews(user, data.news);
  const displayName = clipText(user.displayName, 60);
  const city = clipText(user.city, 48);
  const weatherSummary = clipText(data.weather.summary, 80);
  const zodiacSign = clipText(user.zodiacSign || data.zodiac.sign, 24);
  const numerologyNumber = user.numerologyNumber ?? data.numerology.number;
  const zodiacNote = clipText(data.zodiac.note.toLowerCase(), 115);
  const numerologyNote = clipText(data.numerology.note.toLowerCase(), 100);
  const newsOne = {
    title: clipText(news[0].title, 64),
    summary: clipText(news[0].summary, 115),
  };
  const newsTwo = {
    title: clipText(news[1].title, 64),
    summary: clipText(news[1].summary, 115),
  };
  const kindnessTask = clipText(data.kindnessTask, 130);
  const affirmation = clipText(data.affirmation, 145);
  const marketDirection =
    data.market.tone === "up" ? "higher" : data.market.tone === "down" ? "softer" : "steady";

  const lines = [
    `Good morning, ${displayName}.`,
    `${data.localDate} Daily Ping for ${city}: ${weatherSummary}, ${data.weather.temperatureC}C, ${data.weather.rainChancePercent}% rain chance.`,
    `Markets: ${data.market.indexName} ${marketDirection} ${data.market.changePercent.toFixed(2)}%. Gold INR ${data.goldSilver.goldInrPer10g.toLocaleString("en-IN")}/10g; silver INR ${data.goldSilver.silverInrPerKg.toLocaleString("en-IN")}/kg. Info only, not financial advice.`,
    `Zodiac/numerology: ${zodiacSign} favors ${zodiacNote} Number ${numerologyNumber}: ${numerologyNote}`,
    `Lucky: ${data.luckySignals.color}, ${data.luckySignals.number}. Power Hours: ${data.powerHours.join(", ")}.`,
    `Good coming: a calm opening can turn into a useful conversation today.`,
    `Positive highlights: ${newsOne.title} - ${newsOne.summary} ${newsTwo.title} - ${newsTwo.summary}`,
    `Positive-impact task: ${kindnessTask}`,
    affirmation,
    `Reply VOICE for audio. Reply PAUSE, RESUME, LANGUAGE, TIME, PROFILE, or STOP anytime.`,
  ];

  return lines.join("\n\n");
}

export function makeTemplateVariables(user: BriefUser, data: BriefSourceData) {
  const news = selectPositiveNews(user, data.news);

  return {
    name: clipText(user.displayName, 80),
    city: clipText(user.city, 64),
    weather: `${clipText(data.weather.summary, 80)}, ${data.weather.temperatureC}C`,
    market: `${clipText(data.market.indexName, 48)} ${data.market.changePercent.toFixed(2)}%`,
    metals: `Gold INR ${data.goldSilver.goldInrPer10g.toLocaleString("en-IN")}/10g, Silver INR ${data.goldSilver.silverInrPerKg.toLocaleString("en-IN")}/kg`,
    zodiac: clipText(`${user.zodiacSign || data.zodiac.sign}: ${data.zodiac.note}`, 180),
    numerology: clipText(`${user.numerologyNumber ?? data.numerology.number}: ${data.numerology.note}`, 160),
    lucky: `${clipText(data.luckySignals.color, 32)}, ${data.luckySignals.number}`,
    powerHours: data.powerHours.join(", "),
    positiveNews: clipText(news.map((item) => item.title).join(" | "), 180),
    kindnessTask: clipText(data.kindnessTask, 180),
    affirmation: clipText(data.affirmation, 180),
  };
}

export function createSourceHash(user: BriefUser, data: BriefSourceData) {
  return createHash("sha256")
    .update(JSON.stringify({ user, data }))
    .digest("hex");
}
