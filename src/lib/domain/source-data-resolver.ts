import "server-only";

import type { BriefSourceData, BriefUser } from "./brief";
import { buildSourceData, mergeSourceData, type DataFreshness, type LiveDataResults } from "./source-data";
import {
  fetchGoldSilver,
  fetchMarket,
  fetchPositiveNews,
  fetchWeather,
  type GoldSilverFeed,
  type MarketFeed,
  type NewsFeedItem,
  type WeatherFeed,
} from "@/lib/providers/data-feeds";

export type ResolvedSourceData = {
  data: BriefSourceData;
  freshness: DataFreshness;
};

export type DataFeedFetchers = {
  weather: (city: string, country: string, dateKey: string) => Promise<WeatherFeed | null>;
  market: (marketPreference: string, dateKey: string) => Promise<MarketFeed | null>;
  goldSilver: (country: string, dateKey: string) => Promise<GoldSilverFeed | null>;
  news: (country: string, region: string, languageCode: string, dateKey: string) => Promise<NewsFeedItem[] | null>;
};

const defaultFetchers: DataFeedFetchers = {
  weather: fetchWeather,
  market: fetchMarket,
  goldSilver: fetchGoldSilver,
  news: fetchPositiveNews,
};

export async function resolveSourceData(
  user: BriefUser,
  localDate: string,
  options: { fetchers?: Partial<DataFeedFetchers>; now?: Date } = {},
): Promise<ResolvedSourceData> {
  const fetchers = { ...defaultFetchers, ...options.fetchers };
  const now = options.now ?? new Date();
  const seed = buildSourceData(user, localDate);

  const [weather, market, goldSilver, news] = await Promise.all([
    fetchers.weather(user.city, user.country, localDate),
    fetchers.market(user.marketPreference, localDate),
    fetchers.goldSilver(user.country, localDate),
    fetchers.news(user.country, user.region ?? "", user.languageCode, localDate),
  ]);

  const live: LiveDataResults = { weather, market, goldSilver, news };
  return mergeSourceData(seed, live, now.toISOString());
}
