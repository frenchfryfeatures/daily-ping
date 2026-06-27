import type { CostModel } from "@/lib/domain/cost";

export type DashboardMode = "database" | "demo-fallback";

export type Kpi = {
  label: string;
  value: string;
  detail: string;
  tone: "good" | "watch" | "bad" | "neutral";
};

export type DispatchRow = {
  id: string;
  userId: string;
  name: string;
  city: string;
  timezone: string;
  source: string;
  localDate: string;
  dueAt: string;
  kind: string;
  status: string;
  attempts: number;
  lastError: string | null;
  voiceRequested: boolean;
};

export type UserRow = {
  id: string;
  name: string;
  phone: string;
  instagramHandle: string | null;
  snapchatHandle: string | null;
  preferredChannels: string[];
  source: string;
  isTestRecipient: boolean;
  status: string;
  city: string;
  country: string;
  timezone: string;
  preferredSendTime: string;
  languageCode: string;
  language: string;
  marketPreference: string;
  currentStreak: number;
  longestStreak: number;
  tags: string[];
  consent: string;
  textConsentGranted: boolean;
  voiceConsentGranted: boolean;
  lastBriefStatus: string;
  adminNotes: string | null;
  voiceEnabled: boolean;
  customVoiceEnabled: boolean;
  serviceWindowOpen: boolean;
  lastDeliveredAt: string | null;
  lastVoiceRequestedAt: string | null;
};

export type ContentRow = {
  id: string;
  category: string;
  languageCode: string;
  title: string;
  body: string;
  status: string;
  usageCount: number;
};

export type AnalyticsPoint = {
  label: string;
  value: number;
  target?: number;
};

export type OpsSignal = {
  label: string;
  value: string;
  detail: string;
  tone: "good" | "watch" | "bad" | "neutral";
};

export type SegmentRow = {
  label: string;
  value: number;
  detail: string;
};

export type ChannelReadiness = {
  id: "whatsapp" | "instagram" | "snapchat";
  label: string;
  status: "live_ready" | "test_ready" | "setup_required" | "policy_gated";
  tone: "good" | "watch" | "bad" | "neutral";
  dispatchMode: string;
  audience: string;
  configuredCount: number;
  missingCount: number;
  todayQueued: number;
  todaySent: number;
  openWindows: number;
  blockers: string[];
  nextActions: string[];
  moat: string[];
  complianceNote: string;
};

export type DashboardSnapshot = {
  mode: DashboardMode;
  generatedAt: string;
  warning: string | null;
  safety: {
    adminProtected: boolean;
    schedulerProtected: boolean;
    liveSendsEnabled: boolean;
    testRecipientConfigured: boolean;
    sarvamReady: boolean;
  };
  kpis: Kpi[];
  dispatch: DispatchRow[];
  users: UserRow[];
  content: ContentRow[];
  analytics: {
    funnel: AnalyticsPoint[];
    streakCohorts: AnalyticsPoint[];
    delivery: AnalyticsPoint[];
    costs: AnalyticsPoint[];
  };
  costModel: CostModel;
  operations: {
    signals: OpsSignal[];
    channels: ChannelReadiness[];
    moat: {
      label: string;
      detail: string;
      status: "active" | "next" | "manual_review";
    }[];
    timezoneCoverage: SegmentRow[];
    languageCoverage: SegmentRow[];
    scheduleWindows: SegmentRow[];
    cacheGroups: SegmentRow[];
  };
  templates: {
    name: string;
    languageCode: string;
    category: string;
    status: string;
    body: string;
    variables: string[];
  }[];
  audit: {
    actor: string;
    type: string;
    reason: string;
    createdAt: string;
  }[];
};
