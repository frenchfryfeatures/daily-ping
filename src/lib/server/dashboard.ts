import "server-only";

import { getPrisma } from "@/lib/db/prisma";
import { buildChannelReadiness, buildSubscriberMoat } from "@/lib/domain/channels";
import { estimateMonthlyCost, type CostAssumptions } from "@/lib/domain/cost";
import { hasGrantedConsent } from "@/lib/domain/eligibility";
import { buildPilotProfiles, contentLibrary } from "@/lib/demo/pilot-fixtures";
import { envValue } from "@/lib/env";
import { formatCurrencyInr, formatNumber, formatPercent } from "@/lib/utils";
import type { DashboardSnapshot, DispatchRow, Kpi, OpsSignal, SegmentRow, UserRow } from "@/types/dashboard";

function toneForFailureRate(rate: number): Kpi["tone"] {
  if (rate > 0.08) return "bad";
  if (rate > 0.03) return "watch";
  return "good";
}

function calculateKpis(input: {
  users: UserRow[];
  dispatch: DispatchRow[];
  voiceMessages: number;
  costPerUserMonthInr?: number;
}): Kpi[] {
  const active = input.users.filter((user) => user.status === "ACTIVE").length;
  const onboarded = input.users.filter((user) => user.status !== "ONBOARDING").length;
  const sent = input.dispatch.filter((job) => job.status === "SENT").length;
  const failed = input.dispatch.filter((job) => job.status === "FAILED").length;
  const failureRate = input.dispatch.length ? failed / input.dispatch.length : 0;
  const voiceRate = sent ? input.voiceMessages / sent : 0;
  const weekStreaks = input.users.filter((user) => user.currentStreak >= 7).length;
  const estimatedCost = input.costPerUserMonthInr ?? sent * 0.115 + input.voiceMessages * 1.75;

  return [
    {
      label: "Active pilot users",
      value: formatNumber(active),
      detail: `${formatNumber(onboarded)} onboarded of ${formatNumber(input.users.length)} records`,
      tone: active >= 30 ? "good" : "watch",
    },
    {
      label: "Today sent",
      value: formatNumber(sent),
      detail: `${formatNumber(failed)} failed, ${formatNumber(input.dispatch.length)} total jobs`,
      tone: toneForFailureRate(failureRate),
    },
    {
      label: "Voice reply rate",
      value: formatPercent(voiceRate),
      detail: `${formatNumber(input.voiceMessages)} voice notes after user replies`,
      tone: voiceRate >= 0.18 ? "good" : "neutral",
    },
    {
      label: "7-day streaks",
      value: formatNumber(weekStreaks),
      detail: "Users at or beyond the first retention milestone",
      tone: weekStreaks >= 8 ? "good" : "watch",
    },
    {
      label: "Ops cost / user",
      value: formatCurrencyInr(estimatedCost),
      detail: "Monthly estimate for 30 text + voice touches",
      tone: estimatedCost <= 45 ? "good" : estimatedCost <= 70 ? "watch" : "bad",
    },
  ];
}

function numberFromEnv(key: string, fallback: number) {
  const raw = envValue(key);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dashboardCostAssumptions(): Partial<CostAssumptions> {
  return {
    whatsappTemplateCostInr: numberFromEnv("WHATSAPP_TEMPLATE_COST_INR", 0.115),
    dataFetchCostPerGroupDayInr: numberFromEnv("DATA_FETCH_COST_PER_GROUP_DAY_INR", 0.4),
    infraBufferPerUserMonthInr: numberFromEnv("INFRA_BUFFER_PER_USER_MONTH_INR", 2.5),
    targetPricePerUserMonthInr: numberFromEnv("TARGET_PRICE_PER_USER_MONTH_INR", 149),
    voiceNotesPerUserMonth: numberFromEnv("VOICE_NOTES_PER_USER_MONTH", 30),
  };
}

function countBy<T>(rows: T[], key: (row: T) => string, detail: (row: T[]) => string): SegmentRow[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const groupKey = key(row);
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), row]);
  }

  return [...groups.entries()]
    .map(([label, values]) => ({ label, value: values.length, detail: detail(values) }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
}

function buildOperations(input: {
  users: UserRow[];
  dispatch: DispatchRow[];
  templates: { languageCode: string; status: string }[];
}): DashboardSnapshot["operations"] {
  const activeUsers = input.users.filter((user) => user.status === "ACTIVE");
  const failedJobs = input.dispatch.filter((job) => job.status === "FAILED").length;
  const approvedTemplateLanguages = new Set(
    input.templates.filter((template) => /approved/i.test(template.status)).map((template) => template.languageCode),
  );
  const activeLanguages = new Set(activeUsers.map((user) => (user.languageCode === "en" ? "en_US" : user.languageCode)));
  const missingTemplateLanguages = [...activeLanguages].filter((language) => !approvedTemplateLanguages.has(language));
  const voiceEnabled = activeUsers.filter((user) => user.voiceEnabled).length;
  const customVoiceQueue = activeUsers.filter((user) => user.customVoiceEnabled).length;
  const textConsentGaps = activeUsers.filter((user) => !user.textConsentGranted).length;
  const voiceConsentGaps = activeUsers.filter((user) => !user.voiceConsentGranted).length;
  const openServiceWindows = activeUsers.filter((user) => user.serviceWindowOpen).length;

  const signals: OpsSignal[] = [
    {
      label: "Dispatch risk",
      value: formatNumber(failedJobs),
      detail: failedJobs ? "Failed jobs need retry or content correction." : "No failed jobs in the current queue.",
      tone: failedJobs > 2 ? "bad" : failedJobs ? "watch" : "good",
    },
    {
      label: "Template coverage",
      value: missingTemplateLanguages.length ? `${missingTemplateLanguages.length} gaps` : "Covered",
      detail: missingTemplateLanguages.length
        ? `Missing approved templates for ${missingTemplateLanguages.join(", ")}.`
        : "Active languages have an approved or ready template path.",
      tone: missingTemplateLanguages.length ? "watch" : "good",
    },
    {
      label: "Voice eligibility",
      value: formatPercent(activeUsers.length ? voiceEnabled / activeUsers.length : 0),
      detail: `${formatNumber(voiceEnabled)} active users can request reply-triggered voice notes.`,
      tone: voiceEnabled >= activeUsers.length * 0.8 ? "good" : "watch",
    },
    {
      label: "Consent gaps",
      value: formatNumber(textConsentGaps + voiceConsentGaps),
      detail: `${formatNumber(textConsentGaps)} text gaps and ${formatNumber(voiceConsentGaps)} voice gaps among active users.`,
      tone: textConsentGaps || voiceConsentGaps ? "bad" : "good",
    },
    {
      label: "Service windows",
      value: formatNumber(openServiceWindows),
      detail: "Active users with a recent inbound WhatsApp message, allowing reply-triggered audio.",
      tone: openServiceWindows ? "good" : "neutral",
    },
    {
      label: "Custom voice review",
      value: formatNumber(customVoiceQueue),
      detail: "Loved-one/custom voice must stay manual-review and consent gated.",
      tone: customVoiceQueue ? "watch" : "neutral",
    },
  ];

  return {
    signals,
    channels: buildChannelReadiness({
      env: envValue,
      activeUsers: activeUsers.length,
      dispatchJobs: input.dispatch.length,
      sentToday: input.dispatch.filter((job) => job.status === "SENT").length,
      whatsappReachable: activeUsers.filter((user) => user.phone).length,
      instagramReachable: activeUsers.filter((user) => user.instagramHandle).length,
      snapchatReachable: activeUsers.filter((user) => user.snapchatHandle).length,
      serviceWindows: openServiceWindows,
    }),
    moat: buildSubscriberMoat(),
    timezoneCoverage: countBy(
      activeUsers,
      (user) => user.timezone,
      (rows) => `${formatNumber(rows.length)} active users`,
    ),
    languageCoverage: countBy(
      activeUsers,
      (user) => `${user.language} (${user.languageCode})`,
      (rows) => `${formatNumber(rows.length)} users, ${formatNumber(new Set(rows.map((row) => row.city)).size)} cities`,
    ),
    scheduleWindows: countBy(
      activeUsers,
      (user) => user.preferredSendTime,
      (rows) => `${formatNumber(rows.length)} users across ${formatNumber(new Set(rows.map((row) => row.timezone)).size)} timezones`,
    ),
    cacheGroups: countBy(
      activeUsers,
      (user) => `${user.city} / ${user.marketPreference} / ${user.languageCode}`,
      (rows) => `${formatNumber(rows.length)} users can share weather, market, and positive-news fetches`,
    ),
  };
}

function buildCostModel(input: {
  users: UserRow[];
  dispatch: DispatchRow[];
  averageBriefCharacters: number;
  voiceMessages: number;
}) {
  const activeUsers = input.users.filter((user) => user.status === "ACTIVE");
  const cacheGroups = new Set(activeUsers.map((user) => `${user.city}:${user.marketPreference}:${user.languageCode}`));
  const sent = input.dispatch.filter((job) => job.status === "SENT").length;
  const voiceReplyRate = sent ? input.voiceMessages / sent : 0;

  return estimateMonthlyCost({
    activeUsers: activeUsers.length,
    averageBriefCharacters: input.averageBriefCharacters,
    cachedDataGroups: cacheGroups.size || 1,
    voiceReplyRate,
    assumptions: dashboardCostAssumptions(),
  });
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  try {
    const prisma = getPrisma();
    const [users, jobs, content, templates, adminActions, voiceMessages] = await Promise.all([
      prisma.user.findMany({
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 60,
        include: {
          preferences: true,
          consents: true,
          providerMessages: {
            where: {
              direction: "inbound",
              receivedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
            orderBy: { receivedAt: "desc" },
            take: 1,
          },
          dailyBriefs: {
            orderBy: { generatedAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.deliveryJob.findMany({
        orderBy: { dueAt: "desc" },
        take: 40,
        include: {
          user: true,
          attempts: true,
          brief: true,
        },
      }),
      prisma.contentItem.findMany({
        orderBy: [{ status: "asc" }, { category: "asc" }, { updatedAt: "desc" }],
        take: 40,
      }),
      prisma.whatsAppTemplate.findMany({
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      prisma.adminAction.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.providerMessage.count({
        where: { channel: "whatsapp_audio", direction: "outbound", user: { source: { not: "demo" } } },
      }),
    ]);

    const userRows: UserRow[] = users.map((user) => {
      const granted = user.consents.filter((consent) => consent.status === "GRANTED").length;
      const revoked = user.consents.filter((consent) => consent.status === "REVOKED").length;
      const textConsentGranted = hasGrantedConsent(user.consents, "WHATSAPP_DAILY_TEXT");
      const voiceConsentGranted = hasGrantedConsent(user.consents, "WHATSAPP_VOICE_REPLY");
      return {
        id: user.id,
        name: user.displayName,
        phone: user.phone,
        instagramHandle: user.instagramHandle,
        snapchatHandle: user.snapchatHandle,
        preferredChannels: user.preferredChannels,
        source: user.source,
        isTestRecipient:
          Boolean(envValue("PILOT_TEST_PHONE")) &&
          user.phone.replace(/[^\d]/g, "") === envValue("PILOT_TEST_PHONE")?.replace(/[^\d]/g, ""),
        status: user.status,
        city: user.city,
        country: user.country,
        timezone: user.timezone,
        preferredSendTime: user.preferredSendTime,
        language: user.languageName,
        languageCode: user.languageCode,
        marketPreference: user.marketPreference,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        tags: user.tags,
        consent: `${granted} granted${revoked ? `, ${revoked} revoked` : ""}`,
        textConsentGranted,
        voiceConsentGranted,
        lastBriefStatus: user.dailyBriefs[0]?.status ?? "not_generated",
        adminNotes: user.adminNotes,
        voiceEnabled: user.preferences?.voiceEnabled ?? true,
        customVoiceEnabled: user.preferences?.customVoiceEnabled ?? false,
        serviceWindowOpen: user.providerMessages.length > 0,
        lastDeliveredAt: user.lastDeliveredAt?.toISOString() ?? null,
        lastVoiceRequestedAt: user.lastVoiceRequestedAt?.toISOString() ?? null,
      };
    });

    const dispatchRows: DispatchRow[] = jobs.map((job) => ({
      id: job.id,
      userId: job.userId,
      name: job.user.displayName,
      city: job.user.city,
      timezone: job.user.timezone,
      source: job.user.source,
      localDate: job.localDate,
      dueAt: job.dueAt.toISOString(),
      kind: job.kind,
      status: job.status,
      attempts: job.attemptsCount,
      lastError: job.lastError,
      voiceRequested: job.brief?.status === "VOICE_SENT",
    }));

    const briefLengths = users.map((user) => user.dailyBriefs[0]?.canonicalText.length ?? 0).filter(Boolean);
    const averageBriefCharacters = briefLengths.length
      ? Math.round(briefLengths.reduce((sum, length) => sum + length, 0) / briefLengths.length)
      : 900;
    const templateRows = templates.map((template) => ({
      name: template.name,
      languageCode: template.languageCode,
      category: template.category,
      status: template.status,
      body: template.body,
      variables: template.variables,
    }));
    const pilotUsers = userRows.filter((user) => user.source !== "demo");
    const pilotDispatch = dispatchRows.filter((job) => job.source !== "demo");
    const costModel = buildCostModel({
      users: pilotUsers,
      dispatch: pilotDispatch,
      averageBriefCharacters,
      voiceMessages,
    });
    const kpis = calculateKpis({
      users: pilotUsers,
      dispatch: pilotDispatch,
      voiceMessages,
      costPerUserMonthInr: costModel.scenarios[0]?.costPerUserMonthInr,
    });

    return {
      mode: "database",
      generatedAt: new Date().toISOString(),
      warning:
        pilotUsers.length === 0 && userRows.some((user) => user.source === "demo")
          ? "Production contains demo records for exploration, but they are isolated from scheduling and excluded from pilot metrics. Onboard an allowlisted pilot user before testing."
          : null,
      safety: {
        adminProtected: Boolean(envValue("ADMIN_BASIC_USER") && envValue("ADMIN_BASIC_PASSWORD")),
        schedulerProtected: Boolean(envValue("SCHEDULER_SECRET")),
        liveSendsEnabled: envValue("PILOT_LIVE_SENDS_ENABLED")?.toLowerCase() === "true",
        testRecipientConfigured: Boolean(envValue("PILOT_TEST_PHONE")),
        sarvamReady: envValue("TTS_PROVIDER") === "sarvam" && Boolean(envValue("SARVAM_API_KEY")),
      },
      kpis,
      dispatch: dispatchRows,
      users: userRows,
      content: content.map((item) => ({
        id: item.id,
        category: item.category,
        languageCode: item.languageCode,
        title: item.title,
        body: item.body,
        status: item.status,
        usageCount: item.usageCount,
      })),
      analytics: buildAnalytics(pilotUsers, pilotDispatch, voiceMessages, costModel),
      costModel,
      operations: buildOperations({ users: pilotUsers, dispatch: pilotDispatch, templates: templateRows }),
      templates: templateRows,
      audit: adminActions.map((action) => ({
        actor: action.actor,
        type: action.type,
        reason: action.reason,
        createdAt: action.createdAt.toISOString(),
      })),
    };
  } catch {
    return buildDemoDashboardSnapshot();
  }
}

function buildAnalytics(
  users: UserRow[],
  dispatch: DispatchRow[],
  voiceMessages: number,
  costModel?: DashboardSnapshot["costModel"],
) {
  const active = users.filter((user) => user.status === "ACTIVE").length;
  const onboarded = users.filter((user) => user.status !== "ONBOARDING").length;
  const sent = dispatch.filter((job) => job.status === "SENT").length;
  const failed = dispatch.filter((job) => job.status === "FAILED").length;
  const skipped = dispatch.filter((job) => job.status === "SKIPPED").length;

  return {
    funnel: [
      { label: "Imported", value: users.length, target: 50 },
      { label: "Onboarded", value: onboarded, target: 45 },
      { label: "Active", value: active, target: 35 },
      { label: "Voice requested", value: voiceMessages, target: 12 },
    ],
    streakCohorts: [
      { label: "1 week", value: users.filter((user) => user.currentStreak >= 7).length, target: 18 },
      { label: "1 month", value: users.filter((user) => user.currentStreak >= 30).length, target: 8 },
      { label: "90 days", value: users.filter((user) => user.currentStreak >= 90).length, target: 2 },
    ],
    delivery: [
      { label: "Sent", value: sent },
      { label: "Failed", value: failed },
      { label: "Skipped", value: skipped },
      { label: "Pending", value: dispatch.filter((job) => job.status === "PENDING").length },
    ],
    costs: costModel
      ? [
          { label: "WhatsApp text", value: Math.round(costModel.monthlyWhatsAppCostInr) },
          { label: "Sarvam v2 TTS", value: Math.round(costModel.scenarios[0]?.monthlyTtsCostInr ?? 0) },
          { label: "Data cache", value: Math.round(costModel.monthlyDataCostInr) },
          { label: "Infra buffer", value: Math.round(costModel.monthlyInfraBufferInr) },
        ]
      : [
          { label: "WhatsApp est.", value: Math.round(sent * 0.115) },
          { label: "TTS est.", value: Math.round(voiceMessages * 1.75) },
          { label: "Data APIs est.", value: Math.round(active * 0.18) },
        ],
  };
}

function buildDemoDashboardSnapshot(): DashboardSnapshot {
  const profiles = buildPilotProfiles(36);
  const users: UserRow[] = profiles.map((profile, index) => ({
    id: `demo-${index}`,
    name: profile.displayName,
    phone: profile.phone,
    instagramHandle: index % 3 === 0 ? `@${profile.firstName.toLowerCase()}.daily` : null,
    snapchatHandle: index % 4 === 0 ? `${profile.firstName.toLowerCase()}dose` : null,
    preferredChannels:
      index % 4 === 0 ? ["whatsapp", "instagram", "snapchat"] : index % 3 === 0 ? ["whatsapp", "instagram"] : ["whatsapp"],
    source: "demo",
    isTestRecipient: false,
    status: profile.status,
    city: profile.city,
    country: profile.country,
    timezone: profile.timezone,
    preferredSendTime: profile.preferredSendTime,
    language: profile.languageName,
    languageCode: profile.languageCode,
    marketPreference: profile.marketPreference,
    currentStreak: profile.streakDays,
    longestStreak: Math.max(profile.streakDays, index % 12),
    tags: profile.tags,
    consent: profile.status === "OPTED_OUT" ? "1 granted, 1 revoked" : "2 granted",
    textConsentGranted: profile.status !== "OPTED_OUT",
    voiceConsentGranted: profile.status !== "OPTED_OUT",
    lastBriefStatus:
      profile.status === "ACTIVE" ? (index % 6 === 0 ? "FAILED" : index % 5 === 0 ? "VOICE_SENT" : "TEXT_SENT") : "SKIPPED",
    adminNotes: profile.status === "ADMIN_HOLD" ? "Demo hold pending timezone review." : null,
    voiceEnabled: profile.status !== "OPTED_OUT",
    customVoiceEnabled: index % 11 === 0,
    serviceWindowOpen: index % 5 === 0,
    lastDeliveredAt: profile.status === "ACTIVE" ? new Date(Date.now() - index * 3_600_000).toISOString() : null,
    lastVoiceRequestedAt: index % 5 === 0 ? new Date(Date.now() - index * 7_200_000).toISOString() : null,
  }));
  const dispatch: DispatchRow[] = users.map((user, index) => ({
    id: `demo-job-${index}`,
    userId: user.id,
    name: user.name,
    city: user.city,
    timezone: user.timezone,
    source: "demo",
    localDate: new Date().toISOString().slice(0, 10),
    dueAt: new Date(Date.now() - index * 90_000).toISOString(),
    kind: "DAILY_TEXT",
    status: user.lastBriefStatus === "FAILED" ? "FAILED" : user.lastBriefStatus === "SKIPPED" ? "SKIPPED" : "SENT",
    attempts: user.lastBriefStatus === "SKIPPED" ? 0 : 1,
    lastError: user.lastBriefStatus === "FAILED" ? "Demo provider validation failure." : null,
    voiceRequested: user.lastBriefStatus === "VOICE_SENT",
  }));
  const voiceMessages = dispatch.filter((job) => job.voiceRequested).length;
  const averageBriefCharacters = 1040;
  const templates = [
    {
      name: "daily_dose_ready_v1",
      languageCode: "en_US",
      category: "UTILITY",
      status: "APPROVED",
      body:
        "Hello {{1}}, your requested Daily Dose for {{2}} is ready. Select Get Daily Dose below to receive today's personalised briefing and voice option.",
      variables: ["name", "date"],
    },
    {
      name: "daily_ping_morning_brief_hi",
      languageCode: "hi",
      category: "MARKETING",
      status: "DRAFT_READY_FOR_META_REVIEW",
      body:
        "Good morning {{name}}. Aaj ka Daily Ping: {{weather}}, {{market}}, {{metals}}, lucky {{lucky}}. Reply VOICE for audio.",
      variables: ["name", "weather", "market", "metals", "lucky"],
    },
  ];
  const costModel = buildCostModel({ users, dispatch, averageBriefCharacters, voiceMessages });

  return {
    mode: "demo-fallback",
    generatedAt: new Date().toISOString(),
    warning:
      "Showing demo fallback because the live database connection is not configured for this deployment. Attach the production Postgres connection in Vercel env vars to switch to persisted operations.",
    safety: {
      adminProtected: false,
      schedulerProtected: false,
      liveSendsEnabled: false,
      testRecipientConfigured: false,
      sarvamReady: false,
    },
    kpis: calculateKpis({ users, dispatch, voiceMessages, costPerUserMonthInr: costModel.scenarios[0]?.costPerUserMonthInr }),
    dispatch,
    users,
    content: contentLibrary.map((item, index) => ({
      id: `demo-content-${index}`,
      category: item.category,
      languageCode: "en",
      title: item.title,
      body: item.body,
      status: "ACTIVE",
      usageCount: index * 3,
    })),
    analytics: buildAnalytics(users, dispatch, voiceMessages, costModel),
    costModel,
    operations: buildOperations({ users, dispatch, templates }),
    templates,
    audit: [
      {
        actor: "demo",
        type: "BULK_IMPORT",
        reason: "Demo fallback snapshot loaded while the live database connection is unavailable.",
        createdAt: new Date().toISOString(),
      },
    ],
  };
}
