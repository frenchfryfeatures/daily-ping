import { describe, expect, it } from "vitest";
import { buildSourceData, mergeSourceData, type LiveDataResults } from "./source-data";
import type { BriefUser } from "./brief";

const user: BriefUser = {
  displayName: "Aarav Mehta",
  city: "Mumbai",
  region: "Maharashtra",
  country: "India",
  languageCode: "en",
  zodiacSign: "Virgo",
  numerologyNumber: 5,
  marketPreference: "NIFTY 50",
  tonePreference: "warm",
};

const offline: LiveDataResults = {
  weather: null,
  market: null,
  goldSilver: null,
  news: null,
};

describe("source data merge", () => {
  it("falls back to deterministic seed fixtures when no live feed responds", () => {
    const seed = buildSourceData(user, "2026-06-27");
    const { data, freshness } = mergeSourceData(seed, offline, "2026-06-27T04:00:00.000Z");

    expect(freshness.weather).toBe("fallback");
    expect(freshness.market).toBe("fallback");
    expect(freshness.goldSilver).toBe("fallback");
    expect(freshness.news).toBe("fallback");
    expect(data.market.indexName).toBe("NIFTY 50");
    expect(data.weather.temperatureC).toBeGreaterThanOrEqual(22);
    expect(data.news.length).toBeGreaterThan(0);
  });

  it("overrides fields with live feed values and marks them live", () => {
    const seed = buildSourceData(user, "2026-06-27");
    const { data, freshness } = mergeSourceData(
      seed,
      {
        weather: { summary: "heavy rain, carry an umbrella", temperatureC: 27, rainChancePercent: 88 },
        market: { indexName: "NIFTY 50", changePercent: -0.42 },
        goldSilver: { goldInrPer10g: 99120, silverInrPerKg: 112400 },
        news: [
          {
            scope: "regional",
            title: "Mumbai students build reading corners",
            summary: "A school project helps children discover books.",
            sourceName: "Pilot desk",
            sentimentScore: 0.74,
          },
        ],
      },
      "2026-06-27T04:00:00.000Z",
    );

    expect(freshness.weather).toBe("live");
    expect(freshness.market).toBe("live");
    expect(freshness.goldSilver).toBe("live");
    expect(freshness.news).toBe("live");
    expect(data.weather.rainChancePercent).toBe(88);
    expect(data.market.tone).toBe("down");
    expect(data.market.changePercent).toBe(-0.42);
    expect(data.goldSilver.goldInrPer10g).toBe(99120);
    expect(data.news[0].title).toBe("Mumbai students build reading corners");
  });

  it("classifies a near-zero market change as flat", () => {
    const seed = buildSourceData(user, "2026-06-27");
    const { data, freshness } = mergeSourceData(
      seed,
      { ...offline, market: { indexName: "NIFTY 50", changePercent: 0.05 } },
      "2026-06-27T04:00:00.000Z",
    );

    expect(freshness.market).toBe("live");
    expect(data.market.tone).toBe("flat");
  });

  it("falls back to seed news when the live news feed returns an empty list", () => {
    const seed = buildSourceData(user, "2026-06-27");
    const { data, freshness } = mergeSourceData(
      seed,
      { ...offline, news: [] },
      "2026-06-27T04:00:00.000Z",
    );

    expect(freshness.news).toBe("fallback");
    expect(data.news.length).toBeGreaterThan(0);
  });
});
