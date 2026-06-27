import { describe, expect, it } from "vitest";
import { composeDailyBrief, filterPositiveNews, makeTemplateVariables, type BriefSourceData } from "./brief";
import { buildChannelReadiness } from "./channels";
import { parseWhatsAppCommand } from "./commands";
import { buildDailyNudgePayload, extractWhatsAppInboundText, formatUtilityDate } from "./whatsapp";
import { estimateMonthlyCost } from "./cost";
import { canDispatchDailyText, canRequestVoice, canSendDailyText } from "./eligibility";
import { shouldStartStreak, calculateStreak, streakMilestones } from "./streaks";
import { firstStreakDateKey, isWithinDispatchWindow, dailyTextIdempotencyKey } from "./time";

const user = {
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

const source: BriefSourceData = {
  localDate: "2026-06-25",
  weather: { summary: "light clouds", temperatureC: 29, rainChancePercent: 22 },
  market: { indexName: "NIFTY 50", changePercent: 0.42, tone: "up" },
  goldSilver: { goldInrPer10g: 72840, silverInrPerKg: 90400 },
  zodiac: { sign: "Virgo", note: "patient conversations and steady work." },
  numerology: { number: 5, note: "movement, learning, and a flexible plan." },
  luckySignals: { color: "Emerald", number: 8 },
  powerHours: ["08:10-09:20", "17:30-18:15"],
  news: [
    {
      scope: "regional",
      title: "Mumbai students build reading corners",
      summary: "A neighborhood school project is helping children discover books after class.",
      sourceName: "Pilot desk",
      sentimentScore: 0.72,
    },
    {
      scope: "country",
      title: "India makers expand rural solar labs",
      summary: "Small teams are helping communities learn practical clean-energy skills.",
      sourceName: "Pilot desk",
      sentimentScore: 0.68,
    },
  ],
  affirmation: "Universe is with you, and something good is moving toward you soon.",
  kindnessTask: "Call one friend you have not spoken to recently and ask how they are.",
};

const eligibleProfile = {
  status: "ACTIVE",
  onboardingCompletedAt: new Date("2026-06-24T10:45:00.000Z"),
  timezone: "Asia/Kolkata",
  preferredSendTime: "07:30",
  consents: [
    { type: "WHATSAPP_DAILY_TEXT", status: "GRANTED" },
    { type: "WHATSAPP_VOICE_REPLY", status: "GRANTED" },
  ],
  preferences: { voiceEnabled: true, quietDays: [] },
};

describe("daily ping domain", () => {
  it("starts a streak on the next local-calendar day after onboarding", () => {
    const completedAt = new Date("2026-06-24T10:45:00.000Z");
    expect(firstStreakDateKey(completedAt, "Asia/Kolkata")).toBe("2026-06-25");
    expect(shouldStartStreak({ onboardingCompletedAt: completedAt, timezone: "Asia/Kolkata", localDate: "2026-06-24" })).toBe(false);
    expect(shouldStartStreak({ onboardingCompletedAt: completedAt, timezone: "Asia/Kolkata", localDate: "2026-06-25" })).toBe(true);
  });

  it("selects users only inside the configured local dispatch window", () => {
    const now = new Date("2026-06-25T02:05:00.000Z");
    const due = isWithinDispatchWindow({
      now,
      timezone: "Asia/Kolkata",
      preferredSendTime: "07:30",
      windowMinutes: 15,
    });

    expect(due.dateKey).toBe("2026-06-25");
    expect(due.due).toBe(true);
    expect(dailyTextIdempotencyKey("usr_1", due.dateKey)).toBe("daily-text:usr_1:2026-06-25");
  });

  it("parses WhatsApp commands from natural replies", () => {
    expect(parseWhatsAppCommand("Get Daily Dose")).toBe("DAILY");
    expect(parseWhatsAppCommand("voice please")).toBe("VOICE");
    expect(parseWhatsAppCommand("Stop")).toBe("STOP");
    expect(parseWhatsAppCommand("change time")).toBe("UNKNOWN");
    expect(parseWhatsAppCommand("LANGUAGE Hindi")).toBe("LANGUAGE");
  });

  it("builds the approved two-variable utility template payload", () => {
    expect(formatUtilityDate("2026-06-27")).toBe("27 June 2026");
    expect(
      buildDailyNudgePayload({
        to: "+91 90000 00001",
        name: "Nisha",
        dateKey: "2026-06-27",
        templateName: "daily_dose_ready_v1",
        languageCode: "en_US",
      }),
    ).toMatchObject({
      to: "919000000001",
      template: {
        name: "daily_dose_ready_v1",
        language: { code: "en_US" },
        components: [
          {
            parameters: [
              { text: "Nisha" },
              { text: "27 June 2026" },
            ],
          },
        ],
      },
    });
  });

  it("extracts text from template quick replies and interactive buttons", () => {
    expect(extractWhatsAppInboundText({ button: { text: "Get Daily Dose" } })).toBe("Get Daily Dose");
    expect(extractWhatsAppInboundText({ interactive: { button_reply: { title: "Get Daily Dose" } } })).toBe("Get Daily Dose");
    expect(extractWhatsAppInboundText({ text: { body: "VOICE" } })).toBe("VOICE");
  });

  it("rejects negative news candidates before composing the brief", () => {
    const filtered = filterPositiveNews([
      ...source.news,
      {
        scope: "country",
        title: "Fraud case creates political fight",
        summary: "A negative public dispute expands.",
        sourceName: "Rejected desk",
        sentimentScore: 0.9,
      },
      {
        scope: "regional",
        title: "Court lawsuit after blast",
        summary: "A legal dispute expands after an unsafe incident.",
        sourceName: "Rejected desk",
        sentimentScore: 0.9,
      },
    ]);

    expect(filtered).toHaveLength(2);
    expect(filtered.map((item) => item.title)).not.toContain("Fraud case creates political fight");
  });

  it("uses one canonical text for WhatsApp and audio generation", () => {
    const text = composeDailyBrief(user, source);
    const variables = makeTemplateVariables(user, source);

    expect(text).toContain("Good morning, Aarav Mehta.");
    expect(text).toContain("Reply VOICE");
    expect(text).toContain(variables.affirmation);
    expect(text).toContain("not financial advice");
  });

  it("keeps the canonical voice brief inside the cost-aware length budget", () => {
    const longText = "Community teams helped families learn useful practical skills through a joyful local program. ".repeat(20);
    const text = composeDailyBrief(user, {
      ...source,
      news: [
        { ...source.news[0], summary: longText },
        { ...source.news[1], summary: longText },
      ],
      kindnessTask: "Call a friend and listen patiently. ".repeat(20),
      affirmation: "Universe is with you, and something good is moving your way. ".repeat(20),
    });

    expect(text.length).toBeLessThanOrEqual(1200);
    expect(text).toContain("Reply VOICE");
  });

  it("blocks text dispatch when consent, status, or quiet-day rules fail", () => {
    expect(canSendDailyText(eligibleProfile)).toEqual({ ok: true });
    expect(
      canSendDailyText({
        ...eligibleProfile,
        consents: [{ type: "WHATSAPP_VOICE_REPLY", status: "GRANTED" }],
      }),
    ).toEqual({ ok: false, reason: "WhatsApp daily text consent is not granted." });
    expect(canSendDailyText({ ...eligibleProfile, status: "PAUSED" })).toEqual({ ok: false, reason: "User status is PAUSED." });
    expect(
      canDispatchDailyText(
        {
          ...eligibleProfile,
          preferences: { voiceEnabled: true, quietDays: ["Thursday"] },
        },
        new Date("2026-06-25T02:05:00.000Z"),
      ),
    ).toEqual({ ok: false, reason: "Quiet day: Thursday." });
  });

  it("blocks voice unless user is active, consented, enabled, and inside a service window", () => {
    expect(canRequestVoice(eligibleProfile, { serviceWindowOpen: true })).toEqual({ ok: true });
    expect(canRequestVoice(eligibleProfile, { serviceWindowOpen: false })).toEqual({
      ok: false,
      reason: "Voice requires an open WhatsApp customer service window from a recent user message.",
    });
    expect(canRequestVoice({ ...eligibleProfile, status: "ADMIN_HOLD" }, { serviceWindowOpen: true })).toEqual({
      ok: false,
      reason: "User status is ADMIN_HOLD.",
    });
    expect(
      canRequestVoice(
        {
          ...eligibleProfile,
          preferences: { voiceEnabled: false, quietDays: [] },
        },
        { serviceWindowOpen: true },
      ),
    ).toEqual({ ok: false, reason: "Voice is disabled for this user." });
  });

  it("calculates current and milestone streaks from the ledger", () => {
    const result = calculateStreak(
      [
        { localDate: "2026-06-23", status: "COUNTED" },
        { localDate: "2026-06-24", status: "COUNTED" },
        { localDate: "2026-06-25", status: "COUNTED" },
      ],
      "2026-06-25",
    );

    expect(result).toEqual({ current: 3, longest: 3 });
    expect(streakMilestones(30).label).toBe("1 month");
  });

  it("models monthly costs for 30 WhatsApp text and voice notes per user", () => {
    const model = estimateMonthlyCost({
      activeUsers: 100,
      averageBriefCharacters: 1000,
      cachedDataGroups: 12,
      voiceReplyRate: 0.24,
      assumptions: {
        whatsappTemplateCostInr: 0.86,
        voiceNotesPerUserMonth: 30,
        targetPricePerUserMonthInr: 99,
      },
    });

    expect(model.monthlyTextMessages).toBe(3000);
    expect(model.monthlyVoiceNotes).toBe(3000);
    expect(model.scenarios.find((scenario) => scenario.id === "sarvam-v2")?.monthlyTtsCostInr).toBe(4500);
    expect(model.recommendedScenarioId).toBe("sarvam-v2");
  });

  it("does not invent fixed data costs when no users are active", () => {
    const model = estimateMonthlyCost({
      activeUsers: 0,
      averageBriefCharacters: 1000,
      cachedDataGroups: 0,
      voiceReplyRate: 0,
    });

    expect(model.monthlyTextMessages).toBe(0);
    expect(model.monthlyVoiceNotes).toBe(0);
    expect(model.monthlyDataCostInr).toBe(0);
    expect(model.scenarios[0].costPerUserMonthInr).toBe(0);
  });

  it("keeps multi-channel readiness honest about platform gates", () => {
    const env = (key: string) =>
      ({
        WHATSAPP_ACCESS_TOKEN: "token",
        WHATSAPP_PHONE_NUMBER_ID: "phone",
        WHATSAPP_VERIFY_TOKEN: "verify",
        WHATSAPP_DAILY_TEMPLATE_NAME: "hello_world",
        WHATSAPP_BUSINESS_PHONE_REGISTERED: "false",
        WHATSAPP_PAYMENT_READY: "false",
        INSTAGRAM_ACCESS_TOKEN: "ig",
        INSTAGRAM_BUSINESS_ACCOUNT_ID: "ig-business",
        INSTAGRAM_PAGE_ID: "page",
        INSTAGRAM_WEBHOOK_VERIFY_TOKEN: "ig-verify",
        INSTAGRAM_MESSAGING_REVIEW_APPROVED: "false",
      })[key];

    const channels = buildChannelReadiness({
      env,
      activeUsers: 10,
      dispatchJobs: 8,
      sentToday: 5,
      whatsappReachable: 10,
      instagramReachable: 4,
      snapchatReachable: 2,
      serviceWindows: 3,
    });

    expect(channels.find((channel) => channel.id === "whatsapp")?.status).toBe("test_ready");
    expect(channels.find((channel) => channel.id === "instagram")?.status).toBe("policy_gated");
    expect(channels.find((channel) => channel.id === "snapchat")?.status).toBe("setup_required");
  });
});
