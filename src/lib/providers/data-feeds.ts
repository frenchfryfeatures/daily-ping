import "server-only";

import { envValue } from "@/lib/env";

export type WeatherFeed = {
  summary: string;
  temperatureC: number;
  rainChancePercent: number;
};

export type MarketFeed = {
  indexName: string;
  changePercent: number;
};

export type GoldSilverFeed = {
  goldInrPer10g: number;
  silverInrPerKg: number;
};

export type NewsFeedItem = {
  scope: "regional" | "country";
  title: string;
  summary: string;
  sourceName: string;
  sentimentScore: number;
};

export type DataFeedSource = "live" | "fallback";

type CacheEntry = { value: unknown; expiresAt: number };

const cache = new Map<string, CacheEntry>();

function cacheTtlMs(): number {
  const minutes = Number(envValue("DATA_CACHE_TTL_MINUTES") ?? 60);
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 60) * 60_000;
}

function groupKey(parts: { city: string; marketPreference: string; languageCode: string }) {
  return `${parts.city}|${parts.marketPreference}|${parts.languageCode}`;
}

function readCache<T>(bucket: string, group: string, dateKey: string): T | null {
  const key = `${bucket}:${group}:${dateKey}`;
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

function writeCache<T>(bucket: string, group: string, dateKey: string, value: T) {
  cache.set(`${bucket}:${group}:${dateKey}`, { value, expiresAt: Date.now() + cacheTtlMs() });
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(4000) });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

const weatherCodeSummary: Record<number, string> = {
  0: "clear morning light with mild clouds",
  1: "mainly clear with soft morning light",
  2: "partly cloudy with gentle brightness",
  3: "soft clouds with mild overcast",
  45: "morning mist reducing visibility",
  48: "fog patches lingering early",
  51: "light drizzle with a soft-rain watch",
  53: "light drizzle easing through the morning",
  55: "soft rain with a light-rain watch",
  56: "light freezing drizzle",
  57: "freezing drizzle, dress warm",
  61: "light rain with a soft-rain watch",
  63: "rain with a light-rain watch",
  65: "heavier rain, carry an umbrella",
  66: "freezing rain, take care",
  67: "freezing rain, take care",
  71: "light snow, dress warm",
  73: "snow with a soft wintry watch",
  75: "heavier snow, dress warm",
  77: "snow grains, dress warm",
  80: "rain showers with a light-rain watch",
  81: "rain showers, carry an umbrella",
  82: "heavy rain showers, carry an umbrella",
  85: "snow showers, dress warm",
  86: "heavy snow showers, dress warm",
  95: "thunderstorm, stay safe indoors",
  96: "thunderstorm with hail, stay safe",
  99: "heavy thunderstorm with hail, stay safe",
};

type GeocodeResult = { results?: { latitude: number; longitude: number }[] };
type OpenMeteoResult = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    precipitation_probability?: number;
  };
};

export async function fetchWeather(
  city: string,
  country: string,
  dateKey: string,
): Promise<WeatherFeed | null> {
  const group = groupKey({ city, marketPreference: "", languageCode: "" });
  const cached = readCache<WeatherFeed>("weather", group, dateKey);
  if (cached) return cached;

  const geocode = await fetchJson<GeocodeResult>(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
  );
  const hit = geocode?.results?.[0];
  if (!hit) return null;

  const weather = await fetchJson<OpenMeteoResult>(
    `https://api.open-meteo.com/v1/forecast?latitude=${hit.latitude}&longitude=${hit.longitude}&current=temperature_2m,weather_code,precipitation_probability`,
  );
  const current = weather?.current;
  if (current?.temperature_2m === undefined || current.weather_code === undefined) return null;

  const value: WeatherFeed = {
    summary: weatherCodeSummary[current.weather_code] ?? "mild morning conditions",
    temperatureC: Math.round(current.temperature_2m),
    rainChancePercent: Math.min(100, Math.max(0, Math.round(current.precipitation_probability ?? 0))),
  };
  writeCache("weather", group, dateKey, value);
  return value;
}

type MarketApiResponse = { indexName?: string; changePercent?: number };

export async function fetchMarket(marketPreference: string, dateKey: string): Promise<MarketFeed | null> {
  const url = envValue("MARKET_DATA_API_URL");
  if (!url) return null;
  const group = groupKey({ city: "", marketPreference, languageCode: "" });
  const cached = readCache<MarketFeed>("market", group, dateKey);
  if (cached) return cached;

  const headers: Record<string, string> = {};
  const key = envValue("MARKET_DATA_API_KEY");
  if (key) headers.Authorization = `Bearer ${key}`;

  const data = await fetchJson<MarketApiResponse>(`${url}?index=${encodeURIComponent(marketPreference)}`, { headers });
  if (!data || data.changePercent === undefined) return null;

  const value: MarketFeed = {
    indexName: data.indexName ?? marketPreference,
    changePercent: Number(data.changePercent),
  };
  writeCache("market", group, dateKey, value);
  return value;
}

type GoldSilverApiResponse = { goldInrPer10g?: number; silverInrPerKg?: number };

export async function fetchGoldSilver(country: string, dateKey: string): Promise<GoldSilverFeed | null> {
  const url = envValue("GOLD_API_URL");
  if (!url) return null;
  const group = groupKey({ city: "", marketPreference: country, languageCode: "" });
  const cached = readCache<GoldSilverFeed>("gold", group, dateKey);
  if (cached) return cached;

  const headers: Record<string, string> = {};
  const key = envValue("GOLD_API_KEY");
  if (key) headers.Authorization = `Bearer ${key}`;

  const data = await fetchJson<GoldSilverApiResponse>(`${url}?country=${encodeURIComponent(country)}`, { headers });
  if (!data || data.goldInrPer10g === undefined || data.silverInrPerKg === undefined) return null;

  const value: GoldSilverFeed = {
    goldInrPer10g: Number(data.goldInrPer10g),
    silverInrPerKg: Number(data.silverInrPerKg),
  };
  writeCache("gold", group, dateKey, value);
  return value;
}

type NewsApiResponse = { items?: NewsFeedItem[] } | NewsFeedItem[];

function normalizeNews(data: NewsApiResponse): NewsFeedItem[] {
  if (Array.isArray(data)) return data;
  return data?.items ?? [];
}

export async function fetchPositiveNews(
  country: string,
  region: string,
  languageCode: string,
  dateKey: string,
): Promise<NewsFeedItem[] | null> {
  const url = envValue("POSITIVE_NEWS_API_URL");
  if (!url) return null;
  const group = groupKey({ city: country, marketPreference: region ?? "", languageCode });
  const cached = readCache<NewsFeedItem[]>("news", group, dateKey);
  if (cached) return cached;

  const headers: Record<string, string> = {};
  const key = envValue("POSITIVE_NEWS_API_KEY");
  if (key) headers.Authorization = `Bearer ${key}`;

  const data = await fetchJson<NewsApiResponse>(
    `${url}?country=${encodeURIComponent(country)}&region=${encodeURIComponent(region ?? "")}&language=${encodeURIComponent(languageCode)}`,
    { headers },
  );
  if (!data) return null;

  const items = normalizeNews(data).slice(0, 8);
  if (items.length === 0) return null;
  writeCache("news", group, dateKey, items);
  return items;
}

export function clearDataFeedCache() {
  cache.clear();
}

export function dataFeedConfigurationStatus() {
  return {
    weather: "open-meteo",
    market: Boolean(envValue("MARKET_DATA_API_URL")),
    gold: Boolean(envValue("GOLD_API_URL")),
    news: Boolean(envValue("POSITIVE_NEWS_API_URL")),
  };
}
