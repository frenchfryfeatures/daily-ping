import type { ChannelReadiness } from "@/types/dashboard";

type EnvReader = (key: string) => string | undefined;

type ChannelInput = {
  env: EnvReader;
  activeUsers: number;
  dispatchJobs: number;
  sentToday: number;
  whatsappReachable: number;
  instagramReachable: number;
  snapchatReachable: number;
  serviceWindows: number;
};

function missing(env: EnvReader, keys: string[]) {
  return keys.filter((key) => !env(key));
}

function boolEnv(env: EnvReader, key: string) {
  return env(key)?.toLowerCase() === "true";
}

function whatsappStatus(env: EnvReader, missingCount: number): ChannelReadiness["status"] {
  if (missingCount > 0) return "setup_required";
  if (env("WHATSAPP_DAILY_TEMPLATE_NAME") === "hello_world") return "test_ready";
  if (!boolEnv(env, "WHATSAPP_BUSINESS_PHONE_REGISTERED") || !boolEnv(env, "WHATSAPP_PAYMENT_READY")) return "test_ready";
  if (!boolEnv(env, "PILOT_LIVE_SENDS_ENABLED")) return "test_ready";
  return "live_ready";
}

function instagramStatus(env: EnvReader, missingCount: number): ChannelReadiness["status"] {
  if (missingCount > 0) return "setup_required";
  if (!boolEnv(env, "INSTAGRAM_MESSAGING_REVIEW_APPROVED")) return "policy_gated";
  return "test_ready";
}

function snapchatStatus(env: EnvReader, missingCount: number): ChannelReadiness["status"] {
  if (missingCount > 0) return "setup_required";
  return "policy_gated";
}

function toneForStatus(status: ChannelReadiness["status"]): ChannelReadiness["tone"] {
  if (status === "live_ready") return "good";
  if (status === "test_ready") return "watch";
  if (status === "policy_gated") return "neutral";
  return "bad";
}

export function buildChannelReadiness(input: ChannelInput): ChannelReadiness[] {
  const whatsappMissing = missing(input.env, [
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_VERIFY_TOKEN",
    "WHATSAPP_DAILY_TEMPLATE_NAME",
  ]);
  const instagramMissing = missing(input.env, [
    "INSTAGRAM_ACCESS_TOKEN",
    "INSTAGRAM_BUSINESS_ACCOUNT_ID",
    "INSTAGRAM_PAGE_ID",
    "INSTAGRAM_WEBHOOK_VERIFY_TOKEN",
  ]);
  const snapchatMissing = missing(input.env, [
    "SNAPCHAT_CLIENT_ID",
    "SNAPCHAT_CLIENT_SECRET",
    "SNAPCHAT_AD_ACCOUNT_ID",
    "SNAPCHAT_REFRESH_TOKEN",
  ]);

  const whatsapp = whatsappStatus(input.env, whatsappMissing.length);
  const instagram = instagramStatus(input.env, instagramMissing.length);
  const snapchat = snapchatStatus(input.env, snapchatMissing.length);

  return [
    {
      id: "whatsapp",
      label: "WhatsApp",
      status: whatsapp,
      tone: toneForStatus(whatsapp),
      dispatchMode: "Approved daily template plus reply-triggered voice",
      audience: "Primary morning delivery channel",
      configuredCount: input.whatsappReachable,
      missingCount: Math.max(0, input.activeUsers - input.whatsappReachable),
      todayQueued: input.dispatchJobs,
      todaySent: input.sentToday,
      openWindows: input.serviceWindows,
      blockers: [
        ...whatsappMissing.map((key) => `Missing ${key}`),
        ...(input.env("WHATSAPP_DAILY_TEMPLATE_NAME") === "hello_world" ? ["Using Meta hello_world test template"] : []),
        ...(!boolEnv(input.env, "WHATSAPP_BUSINESS_PHONE_REGISTERED") ? ["Meta Step 2 business phone registration pending"] : []),
        ...(!boolEnv(input.env, "WHATSAPP_PAYMENT_READY") ? ["Business-initiated billing not marked ready"] : []),
        ...(!boolEnv(input.env, "PILOT_LIVE_SENDS_ENABLED") ? ["Live sends are locked until the controlled pilot is approved"] : []),
        ...(!input.env("SARVAM_API_KEY") ? ["Sarvam API key missing; voice remains unavailable"] : []),
      ],
      nextActions: [
        "Run one allowlisted Utility nudge test",
        "Verify Get Daily Dose webhook, canonical text, and voice delivery",
        "Expand approved Utility template coverage by language",
      ],
      moat: ["Local-time streaks", "Reply VOICE audio", "STOP/PAUSE/RESUME safety", "Language template coverage"],
      complianceNote: "Proactive sends must use approved templates; freeform replies require a customer service window.",
    },
    {
      id: "instagram",
      label: "Instagram",
      status: instagram,
      tone: toneForStatus(instagram),
      dispatchMode: "DM after user interaction, keyword, story reply, or approved messaging window",
      audience: "Discovery, youth engagement, creator-led daily dose",
      configuredCount: input.instagramReachable,
      missingCount: Math.max(0, input.activeUsers - input.instagramReachable),
      todayQueued: 0,
      todaySent: 0,
      openWindows: 0,
      blockers: [
        ...instagramMissing.map((key) => `Missing ${key}`),
        ...(!boolEnv(input.env, "INSTAGRAM_MESSAGING_REVIEW_APPROVED") ? ["Instagram Messaging permission/app review pending"] : []),
        "Do not cold-DM daily pings; open the DM window from a user action first",
      ],
      nextActions: [
        "Connect Instagram Business or Creator account to a Facebook Page",
        "Configure Instagram webhooks and messaging permissions",
        "Add keyword opt-in flow: DAILY, PAUSE, STOP, VOICE",
      ],
      moat: ["Story reply activation", "Mood check-in by DM", "Weekly recap card", "Creator/brand broadcast-to-DM funnel"],
      complianceNote: "Treat Instagram as an interaction-led channel, not a daily unsolicited DM channel.",
    },
    {
      id: "snapchat",
      label: "Snapchat",
      status: snapchat,
      tone: toneForStatus(snapchat),
      dispatchMode: "Campaign, story, lens, or ads re-engagement readiness",
      audience: "Top-of-funnel positive ritual and streak discovery",
      configuredCount: input.snapchatReachable,
      missingCount: Math.max(0, input.activeUsers - input.snapchatReachable),
      todayQueued: 0,
      todaySent: 0,
      openWindows: 0,
      blockers: [
        ...snapchatMissing.map((key) => `Missing ${key}`),
        "No production direct-DM subscriber dispatch path is enabled in this app",
      ],
      nextActions: [
        "Create Snapchat business assets and ad account credentials",
        "Use Snap campaigns/lenses as acquisition until an approved messaging path exists",
        "Capture Snapchat handle for segmentation and retargeting exports",
      ],
      moat: ["AR/lens daily affirmation prompts", "Gen-Z acquisition loop", "Snap-to-WhatsApp onboarding", "Good deed challenge creatives"],
      complianceNote: "Prepared for Snapchat campaign orchestration; direct daily DM delivery remains platform-gated.",
    },
  ];
}

export function buildSubscriberMoat() {
  return [
    {
      label: "Mood-adaptive morning brief",
      detail: "Users can reply with energy or mood, then tomorrow's note changes tone instead of feeling generic.",
      status: "next" as const,
    },
    {
      label: "Kindness streak ledger",
      detail: "Good deeds become visible progress: weekly water, call, gratitude, appreciation, and help-someone counters.",
      status: "active" as const,
    },
    {
      label: "Reply-triggered audio",
      detail: "Voice is generated from the same canonical text after a user action, protecting cost and WhatsApp policy.",
      status: "active" as const,
    },
    {
      label: "Loved-one voice governance",
      detail: "Custom voice remains consent, approval, revocation, deletion, and audit gated before any user-facing release.",
      status: "manual_review" as const,
    },
    {
      label: "Cross-channel identity graph",
      detail: "WhatsApp phone, Instagram handle, Snapchat handle, timezone, language, and interests live on one user profile.",
      status: "active" as const,
    },
  ];
}
