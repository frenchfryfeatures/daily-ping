"use client";

import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Camera,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  Globe2,
  Languages,
  MessageCircle,
  Mic2,
  Pause,
  PlugZap,
  Play,
  Radio,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Volume2,
  Wallet,
  Zap,
} from "lucide-react";
import type { AnalyticsPoint, DashboardSnapshot, DispatchRow, Kpi, SegmentRow, UserRow } from "@/types/dashboard";
import { cn, titleCase } from "@/lib/utils";

type Tab = "command" | "channels" | "users" | "costs" | "content" | "analytics" | "db";

const tabs: { id: Tab; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "command", label: "Command", icon: Clock3 },
  { id: "channels", label: "Channels", icon: Send },
  { id: "users", label: "Users", icon: Users },
  { id: "costs", label: "Cost Desk", icon: Wallet },
  { id: "content", label: "Content", icon: SlidersHorizontal },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "db", label: "DB Control", icon: Database },
];

const channelIcons: Record<"whatsapp" | "instagram" | "snapchat", ComponentType<{ className?: string }>> = {
  whatsapp: MessageCircle,
  instagram: Camera,
  snapchat: Radio,
};

const timezoneOptions = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
];

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-IN");

const utcTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const utcDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatInr(value: number) {
  return inrFormatter.format(value);
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatStableTime(value: string) {
  return `${utcTimeFormatter.format(new Date(value))} UTC`;
}

function formatStableDateTime(value: string) {
  return `${utcDateTimeFormatter.format(new Date(value))} UTC`;
}

function formatLocalDateTime(value: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return formatStableDateTime(value);
  }
}

function timezoneChoices(current: string) {
  return timezoneOptions.includes(current) ? timezoneOptions : [current, ...timezoneOptions];
}

type ScheduleDraft = {
  timezone: string;
  preferredSendTime: string;
};

export function DailyPingDashboard({ snapshot }: { snapshot: DashboardSnapshot }) {
  const [activeTab, setActiveTab] = useState<Tab>("command");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [users, setUsers] = useState(snapshot.users);
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<string, ScheduleDraft>>({});
  const recommendedCost = snapshot.costModel.scenarios.find((scenario) => scenario.id === snapshot.costModel.recommendedScenarioId);

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) =>
      [
        user.name,
        user.phone,
        user.city,
        user.country,
        user.status,
        user.language,
        user.languageCode,
        user.timezone,
        user.marketPreference,
        ...user.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, users]);

  function setScheduleDraft(user: UserRow, patch: Partial<ScheduleDraft>) {
    setScheduleDrafts((current) => ({
      ...current,
      [user.id]: {
        timezone: current[user.id]?.timezone ?? user.timezone,
        preferredSendTime: current[user.id]?.preferredSendTime ?? user.preferredSendTime,
        ...patch,
      },
    }));
  }

  async function changeStatus(user: UserRow, status: string) {
    const reason = window.prompt(`Reason for changing ${user.name} to ${status}?`);
    if (!reason) return;
    const response = await fetch(`/api/admin/users/${user.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason }),
    });
    const data = (await response.json()) as { ok: boolean; error?: string; demo?: boolean };
    if (data.ok) {
      setUsers((current) => current.map((row) => (row.id === user.id ? { ...row, status } : row)));
      setNotice(`${user.name} changed to ${status}.${data.demo ? " Demo mode: not persisted." : ""}`);
      return;
    }
    setNotice(data.error ?? "Status change failed.");
  }

  async function saveSchedule(user: UserRow) {
    const draft = scheduleDrafts[user.id] ?? {
      timezone: user.timezone,
      preferredSendTime: user.preferredSendTime,
    };
    const reason = window.prompt(`Reason for changing ${user.name}'s local delivery schedule?`);
    if (!reason) return;
    const response = await fetch(`/api/admin/users/${user.id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, reason }),
    });
    const data = (await response.json()) as {
      ok: boolean;
      timezone?: string;
      preferredSendTime?: string;
      error?: string;
      demo?: boolean;
    };
    if (data.ok && data.timezone && data.preferredSendTime) {
      setUsers((current) =>
        current.map((row) =>
          row.id === user.id ? { ...row, timezone: data.timezone!, preferredSendTime: data.preferredSendTime! } : row,
        ),
      );
      setScheduleDrafts((current) => {
        const next = { ...current };
        delete next[user.id];
        return next;
      });
      setNotice(`${user.name}'s local delivery schedule saved.${data.demo ? " Demo mode: not persisted." : ""}`);
      return;
    }
    setNotice(data.error ?? "Schedule change failed.");
  }

  async function retry(job: DispatchRow) {
    const reason = window.prompt(`Reason for retrying ${job.name}'s ${job.kind} job?`);
    if (!reason) return;
    const response = await fetch(`/api/admin/dispatch/${job.id}/retry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = (await response.json()) as { ok: boolean; error?: string; demo?: boolean };
    setNotice(data.ok ? `Retry recorded for ${job.name}.${data.demo ? " Demo mode: not persisted." : ""}` : data.error ?? "Retry failed.");
  }

  async function testNudge(user: UserRow) {
    const reason = window.prompt(`Reason for sending ${user.name} an allowlisted Utility test?`);
    if (!reason) return;
    setNotice(`Preparing ${user.name}'s Utility test...`);
    const response = await fetch(`/api/admin/users/${user.id}/test-nudge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = (await response.json()) as { ok: boolean; status?: string; error?: string };
    setNotice(
      data.ok
        ? data.status === "dry_run"
          ? `${user.name}'s Utility nudge was simulated. Live sends remain locked.`
          : `${user.name}'s Utility nudge status: ${titleCase(data.status ?? "completed")}.`
        : data.error ?? "Utility test failed.",
    );
  }

  return (
    <main className="daily-ping-surface min-h-screen p-3 sm:p-5">
      <div className="mx-auto flex max-w-[1640px] flex-col gap-4 lg:flex-row">
        <aside className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-white lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)] lg:w-64">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-emerald-400 text-slate-950">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Daily Ping</p>
              <p className="text-xs text-white/55">Ops control room</p>
            </div>
          </div>
          <nav className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors",
                    activeTab === tab.id ? "bg-white text-slate-950" : "text-white/68 hover:bg-white/10 hover:text-white",
                  )}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-4 rounded-md border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-white/68">
            <p className="font-semibold text-white">Cost posture</p>
            <p>{recommendedCost ? `${recommendedCost.label}: ${formatInr(recommendedCost.costPerUserMonthInr)} per user/month` : "No cost model available."}</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 space-y-4">
          <header className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={snapshot.mode === "database" ? "good" : "watch"}>{snapshot.mode === "database" ? "Database live" : "Demo fallback"}</Badge>
                  <Badge tone={snapshot.safety.adminProtected ? "good" : "bad"}>
                    {snapshot.safety.adminProtected ? "Admin protected" : "Admin open"}
                  </Badge>
                  <Badge tone={snapshot.safety.liveSendsEnabled ? "watch" : "good"}>
                    {snapshot.safety.liveSendsEnabled ? "Live sends enabled" : "Live sends locked"}
                  </Badge>
                  <Badge tone={snapshot.safety.sarvamReady ? "good" : "watch"}>
                    {snapshot.safety.sarvamReady ? "Voice ready" : "Voice setup pending"}
                  </Badge>
                  <Badge tone="neutral">Refreshed {formatStableTime(snapshot.generatedAt)}</Badge>
                  <Badge tone="neutral">{snapshot.costModel.assumptions.daysPerMonth} delivery days/month</Badge>
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-normal sm:text-3xl">Daily Dose multi-channel command center</h1>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
                  Control WhatsApp dispatch, Instagram readiness, Snapchat campaign prep, reply-triggered voice, streak health, local schedules, content safety, and cost per user from one surface.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <a className="inline-flex h-10 items-center rounded-md border border-border bg-background px-3 text-sm font-semibold" href="/onboarding">
                  Onboard user
                </a>
                <button className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground" onClick={() => location.reload()} type="button">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>
          </header>

          {snapshot.warning ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              <AlertTriangle className="mr-2 inline h-4 w-4" />
              {snapshot.warning}
            </div>
          ) : null}
          {notice ? <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm font-medium">{notice}</div> : null}

          <KpiGrid kpis={snapshot.kpis} />

          {activeTab === "command" ? <CommandPanel snapshot={snapshot} onRetry={retry} /> : null}
          {activeTab === "channels" ? <ChannelsPanel snapshot={snapshot} /> : null}
          {activeTab === "users" ? (
            <UsersPanel
              onChangeStatus={changeStatus}
              onSaveSchedule={saveSchedule}
              onTestNudge={testNudge}
              query={query}
              rows={filteredUsers}
              scheduleDrafts={scheduleDrafts}
              setQuery={setQuery}
              setScheduleDraft={setScheduleDraft}
              snapshotGeneratedAt={snapshot.generatedAt}
            />
          ) : null}
          {activeTab === "costs" ? <CostPanel snapshot={snapshot} /> : null}
          {activeTab === "content" ? <ContentPanel snapshot={snapshot} /> : null}
          {activeTab === "analytics" ? <AnalyticsPanel analytics={snapshot.analytics} /> : null}
          {activeTab === "db" ? <DbPanel snapshot={snapshot} /> : null}
        </section>
      </div>
    </main>
  );
}

function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {kpis.map((kpi) => (
        <div className="rounded-lg border border-border bg-card p-3" key={kpi.label}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{kpi.label}</p>
            <span className={cn("h-2.5 w-2.5 rounded-full", toneDot(kpi.tone))} />
          </div>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-normal">{kpi.value}</p>
          <p className="mt-1 min-h-10 text-sm leading-5 text-muted-foreground">{kpi.detail}</p>
        </div>
      ))}
    </section>
  );
}

function CommandPanel({ snapshot, onRetry }: { snapshot: DashboardSnapshot; onRetry: (row: DispatchRow) => void }) {
  return (
    <section className="min-w-0 space-y-4">
      <ChannelOverview snapshot={snapshot} />
      <div className="grid min-w-0 gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <DispatchPanel rows={snapshot.dispatch} onRetry={onRetry} />
        <div className="min-w-0 space-y-4">
          <SignalPanel snapshot={snapshot} />
          <SegmentPanel icon={Globe2} rows={snapshot.operations.timezoneCoverage.slice(0, 5)} title="Timezone Coverage" />
          <SegmentPanel icon={Clock3} rows={snapshot.operations.scheduleWindows.slice(0, 5)} title="Local Send Windows" />
        </div>
      </div>
    </section>
  );
}

function ChannelOverview({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <section className="grid gap-3 xl:grid-cols-3">
      {snapshot.operations.channels.map((channel) => {
        const Icon = channelIcons[channel.id];
        return (
          <article className="relative overflow-hidden rounded-lg border border-border bg-card p-4" key={channel.id}>
            <div className="absolute inset-x-0 top-0 h-1 bg-primary/80" />
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-secondary text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold">{channel.label}</h2>
                  <p className="truncate text-xs text-muted-foreground">{channel.dispatchMode}</p>
                </div>
              </div>
              <Badge tone={channel.tone}>{titleCase(channel.status)}</Badge>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <MiniMetric label="Reachable" value={formatNumber(channel.configuredCount)} />
              <MiniMetric label="Queued" value={formatNumber(channel.todayQueued)} />
              <MiniMetric label="Sent" value={formatNumber(channel.todaySent)} />
            </div>
            <p className="mt-3 text-sm leading-5 text-muted-foreground">{channel.audience}</p>
          </article>
        );
      })}
    </section>
  );
}

function ChannelsPanel({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <section className="space-y-4">
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Dispatch Network Readiness</h2>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
              WhatsApp is the primary proactive path. Instagram and Snapchat are prepared as governed engagement channels with clear setup and policy gates.
            </p>
          </div>
          <Badge tone="watch">Device delivery still depends on Meta Step 2 sender registration</Badge>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        {snapshot.operations.channels.map((channel) => (
          <ChannelCard channel={channel} key={channel.id} />
        ))}
      </div>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold">Subscriber Experience Moat</h2>
            </div>
            <p className="text-sm text-muted-foreground">These are the retention loops that make Daily Dose more than a generic message blast.</p>
          </div>
          <div className="divide-y divide-border">
            {snapshot.operations.moat.map((item) => (
              <div className="grid gap-2 p-4 text-sm sm:grid-cols-[130px_1fr]" key={item.label}>
                <Badge tone={item.status === "active" ? "good" : item.status === "manual_review" ? "watch" : "neutral"}>{titleCase(item.status)}</Badge>
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="mt-1 leading-5 text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-2">
              <PlugZap className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold">Provider Setup Console</h2>
            </div>
            <p className="text-sm text-muted-foreground">The dashboard is ready to accept credentials without code changes for the next setup pass.</p>
          </div>
          <div className="divide-y divide-border">
            {[
              ["WhatsApp", "WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN, approved template"],
              ["Instagram", "INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID, INSTAGRAM_PAGE_ID, INSTAGRAM_WEBHOOK_VERIFY_TOKEN"],
              ["Snapchat", "SNAPCHAT_CLIENT_ID, SNAPCHAT_CLIENT_SECRET, SNAPCHAT_AD_ACCOUNT_ID, SNAPCHAT_REFRESH_TOKEN"],
            ].map(([label, detail]) => (
              <div className="grid gap-2 p-4 text-sm sm:grid-cols-[110px_1fr]" key={label}>
                <span className="font-semibold">{label}</span>
                <span className="font-mono text-xs leading-5 text-muted-foreground">{detail}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}

function ChannelCard({ channel }: { channel: DashboardSnapshot["operations"]["channels"][number] }) {
  const Icon = channelIcons[channel.id];
  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-secondary text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold">{channel.label}</h3>
            <p className="truncate text-xs text-muted-foreground">{channel.audience}</p>
          </div>
        </div>
        <Badge tone={channel.tone}>{titleCase(channel.status)}</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 border-b border-border p-3">
        <MiniMetric label="Reach" value={formatNumber(channel.configuredCount)} />
        <MiniMetric label="Gaps" value={formatNumber(channel.missingCount)} />
        <MiniMetric label="Window" value={formatNumber(channel.openWindows)} />
      </div>
      <div className="space-y-3 p-4 text-sm">
        <div>
          <p className="font-medium">Dispatch mode</p>
          <p className="mt-1 leading-5 text-muted-foreground">{channel.dispatchMode}</p>
        </div>
        <div>
          <p className="font-medium">Current blockers</p>
          <ul className="mt-2 space-y-1">
            {channel.blockers.slice(0, 4).map((blocker) => (
              <li className="flex gap-2 text-muted-foreground" key={blocker}>
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span>{blocker}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-medium">Next actions</p>
          <ul className="mt-2 space-y-1">
            {channel.nextActions.map((action) => (
              <li className="flex gap-2 text-muted-foreground" key={action}>
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="rounded-md bg-secondary p-3 text-xs leading-5 text-muted-foreground">{channel.complianceNote}</p>
      </div>
    </article>
  );
}

function SignalPanel({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border p-4">
        <h2 className="text-lg font-semibold">Operational Signals</h2>
        <p className="text-sm text-muted-foreground">Immediate risks across delivery, templates, voice eligibility, and consent-gated voice review.</p>
      </div>
      <div className="divide-y divide-border">
        {snapshot.operations.signals.map((signal) => (
          <div className="grid grid-cols-[120px_1fr] gap-3 p-3 text-sm" key={signal.label}>
            <div>
              <p className="font-mono text-xl font-semibold">{signal.value}</p>
              <span className={cn("mt-1 inline-flex rounded-md px-2 py-0.5 text-xs font-semibold", toneBadge(signal.tone))}>{signal.label}</span>
            </div>
            <p className="leading-5 text-muted-foreground">{signal.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DispatchPanel({ rows, onRetry }: { rows: DispatchRow[]; onRetry: (row: DispatchRow) => void }) {
  const failed = rows.filter((row) => row.status === "FAILED");

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Today&apos;s Dispatch Queue</h2>
          <p className="text-sm text-muted-foreground">Rows show customer local time first; UTC is only audit metadata now.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <Pill icon={MessageCircle} label={`${rows.length} jobs`} />
          <Pill icon={RefreshCw} label={`${failed.length} retry`} />
          <Pill icon={Mic2} label={`${rows.filter((row) => row.voiceRequested).length} voice`} />
        </div>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-sm whitespace-nowrap">
            <thead className="bg-secondary text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                {["User", "City", "Local due", "UTC audit", "Kind", "Status", "Attempts", "Voice", "Error", "Action"].map((header) => (
                  <th className="border-b border-border px-3 py-2 font-semibold" key={header}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-b border-border last:border-b-0" key={row.id}>
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.city}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{formatLocalDateTime(row.dueAt, row.timezone)}</div>
                    <div className="font-mono text-xs text-muted-foreground">{row.timezone}</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{formatStableTime(row.dueAt)}</td>
                  <td className="px-3 py-2">{titleCase(row.kind)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2 font-mono">{row.attempts}</td>
                  <td className="px-3 py-2">{row.voiceRequested ? <Badge tone="good">Requested</Badge> : <Badge tone="neutral">No reply</Badge>}</td>
                  <td className="max-w-[250px] whitespace-normal px-3 py-2 text-muted-foreground">{row.lastError ?? "None"}</td>
                  <td className="px-3 py-2">
                    <button
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs font-semibold disabled:opacity-40"
                      disabled={row.status !== "FAILED"}
                      onClick={() => onRetry(row)}
                      type="button"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Retry
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No dispatch jobs" detail="Run the scheduler or seed data to inspect the current delivery queue." />
      )}
    </section>
  );
}

function UsersPanel({
  rows,
  query,
  setQuery,
  onChangeStatus,
  onSaveSchedule,
  onTestNudge,
  scheduleDrafts,
  setScheduleDraft,
  snapshotGeneratedAt,
}: {
  rows: UserRow[];
  query: string;
  setQuery: (value: string) => void;
  onChangeStatus: (row: UserRow, status: string) => void;
  onSaveSchedule: (row: UserRow) => void;
  onTestNudge: (row: UserRow) => void;
  scheduleDrafts: Record<string, ScheduleDraft>;
  setScheduleDraft: (row: UserRow, patch: Partial<ScheduleDraft>) => void;
  snapshotGeneratedAt: string;
}) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Users, Local Time, and Enrichment</h2>
          <p className="text-sm text-muted-foreground">Edit per-user timezone and delivery time without leaving the operator surface.</p>
        </div>
        <label className="relative w-full lg:w-[420px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, city, tag, status, timezone..."
            value={query}
          />
        </label>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1360px] border-collapse text-sm whitespace-nowrap">
            <thead className="bg-secondary text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                {["User", "Status", "Channels", "Local setup", "Edit schedule", "Streak", "Voice", "Consent", "Tags", "Last brief", "Controls"].map((header) => (
                  <th className="border-b border-border px-3 py-2 font-semibold" key={header}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const draft = scheduleDrafts[row.id] ?? {
                  timezone: row.timezone,
                  preferredSendTime: row.preferredSendTime,
                };
                const dirty = draft.timezone !== row.timezone || draft.preferredSendTime !== row.preferredSendTime;

                return (
                  <tr className="border-b border-border last:border-b-0" key={row.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium">{row.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{row.phone}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.city}, {row.country}
                      </div>
                      <div className="mt-1 flex gap-1">
                        <Badge tone={row.source === "demo" ? "neutral" : "good"}>{row.source === "demo" ? "Demo" : "Pilot"}</Badge>
                        {row.isTestRecipient ? <Badge tone="watch">Test allowlist</Badge> : null}
                      </div>
                      {row.isTestRecipient ? (
                        <button
                          className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2 text-xs font-semibold text-primary disabled:opacity-40"
                          disabled={row.source === "demo" || row.status !== "ACTIVE"}
                          onClick={() => onTestNudge(row)}
                          type="button"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Send test
                        </button>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {row.preferredChannels.map((channel) => (
                          <Badge key={channel} tone={channel === "whatsapp" ? "good" : "neutral"}>
                            {titleCase(channel)}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-1 grid gap-0.5 font-mono text-xs text-muted-foreground">
                        {row.instagramHandle ? <span>{row.instagramHandle}</span> : null}
                        {row.snapchatHandle ? <span>{row.snapchatHandle}</span> : null}
                        {!row.instagramHandle && !row.snapchatHandle ? <span>social handles missing</span> : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">
                        {row.preferredSendTime} local, {row.language}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">{row.timezone}</div>
                      <div className="text-xs text-muted-foreground">Local now {formatLocalDateTime(snapshotGeneratedAt, row.timezone)}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <select
                          className="h-9 w-44 rounded-md border border-input bg-background px-2 text-xs"
                          onChange={(event) => setScheduleDraft(row, { timezone: event.target.value })}
                          value={draft.timezone}
                        >
                          {timezoneChoices(row.timezone).map((timezone) => (
                            <option key={timezone} value={timezone}>
                              {timezone}
                            </option>
                          ))}
                        </select>
                        <input
                          className="h-9 w-24 rounded-md border border-input bg-background px-2 text-xs"
                          onChange={(event) => setScheduleDraft(row, { preferredSendTime: event.target.value })}
                          type="time"
                          value={draft.preferredSendTime}
                        />
                        <button
                          aria-label={`Save schedule for ${row.name}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground disabled:opacity-35"
                          disabled={!dirty}
                          onClick={() => onSaveSchedule(row)}
                          title="Save timezone and time"
                          type="button"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-mono font-semibold">{row.currentStreak}</span>
                      <span className="text-muted-foreground"> current, {row.longestStreak} best</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={row.voiceEnabled ? "good" : "neutral"}>{row.voiceEnabled ? "Voice on" : "Voice off"}</Badge>
                        {row.customVoiceEnabled ? <Badge tone="watch">Custom review</Badge> : null}
                        {row.serviceWindowOpen ? <Badge tone="good">Window open</Badge> : <Badge tone="neutral">Window closed</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={row.textConsentGranted ? "good" : "bad"}>Text</Badge>
                        <Badge tone={row.voiceConsentGranted ? "good" : "bad"}>Voice</Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{row.consent}</div>
                    </td>
                    <td className="max-w-[220px] whitespace-normal px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {row.tags.slice(0, 3).map((tag) => (
                          <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">{titleCase(row.lastBriefStatus)}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <IconButton disabled={row.status === "PAUSED"} icon={Pause} label="Pause" onClick={() => onChangeStatus(row, "PAUSED")} />
                        <IconButton disabled={row.status === "ACTIVE"} icon={Play} label="Resume" onClick={() => onChangeStatus(row, "ACTIVE")} />
                        <IconButton icon={ShieldCheck} label="Hold" onClick={() => onChangeStatus(row, "ADMIN_HOLD")} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No users match this filter" detail="Clear the search or onboard a pilot user to continue." />
      )}
    </section>
  );
}

function CostPanel({ snapshot }: { snapshot: DashboardSnapshot }) {
  const model = snapshot.costModel;
  const recommended = model.scenarios.find((scenario) => scenario.id === model.recommendedScenarioId) ?? model.scenarios[0];

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Monthly Unit Economics</h2>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
              Model assumes each active user receives 30 WhatsApp text messages and {model.assumptions.voiceNotesPerUserMonth} voice notes monthly. WhatsApp rates vary by market and category, so the message cost is an editable assumption.
            </p>
          </div>
          <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
            Recommended: <span className="font-semibold">{recommended?.label}</span>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <CostStat icon={Users} label="Active users" value={formatNumber(model.activeUsers)} detail="Cost base" />
          <CostStat icon={MessageCircle} label="Monthly texts" value={formatNumber(model.monthlyTextMessages)} detail={`${formatInr(model.monthlyWhatsAppCostInr)} WhatsApp`} />
          <CostStat icon={Volume2} label="Monthly voice" value={formatNumber(model.monthlyVoiceNotes)} detail={`${formatNumber(model.averageBriefCharacters)} chars avg`} />
          <CostStat icon={Zap} label="Cached data groups" value={formatNumber(model.cachedDataGroups)} detail={`${formatInr(model.monthlyDataCostInr)} data/month`} />
          <CostStat icon={TrendingUp} label="Target price" value={formatInr(model.assumptions.targetPricePerUserMonthInr)} detail="Per user/month" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4">
            <h3 className="font-semibold">Provider Scenarios</h3>
            <p className="text-sm text-muted-foreground">Sarvam keeps Indian-language audio viable; use v2 by default and v3 where quality is worth the extra cost.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm whitespace-nowrap">
              <thead className="bg-secondary text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  {["Scenario", "TTS rate", "TTS / month", "Total / month", "Cost / user", "Gross margin", "Use"].map((header) => (
                    <th className="border-b border-border px-3 py-2 font-semibold" key={header}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {model.scenarios.map((scenario) => (
                  <tr className="border-b border-border last:border-b-0" key={scenario.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium">{scenario.label}</div>
                      <div className="font-mono text-xs text-muted-foreground">{scenario.model}</div>
                    </td>
                    <td className="px-3 py-2">{formatInr(scenario.ttsCostPer10kCharsInr)} / 10k chars</td>
                    <td className="px-3 py-2 font-mono">{formatInr(scenario.monthlyTtsCostInr)}</td>
                    <td className="px-3 py-2 font-mono">{formatInr(scenario.monthlyTotalCostInr)}</td>
                    <td className="px-3 py-2 font-mono font-semibold">{formatInr(scenario.costPerUserMonthInr)}</td>
                    <td className="px-3 py-2">
                      <Badge tone={scenario.grossMarginPercent >= 55 ? "good" : scenario.grossMarginPercent >= 35 ? "watch" : "bad"}>
                        {formatPercent(scenario.grossMarginPercent)}
                      </Badge>
                    </td>
                    <td className="max-w-[280px] whitespace-normal px-3 py-2 text-muted-foreground">{scenario.notes.join(" ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4">
            <h3 className="font-semibold">Cost Levers</h3>
            <p className="text-sm text-muted-foreground">These are the operating rules that protect margin without degrading output quality.</p>
          </div>
          <div className="divide-y divide-border">
            {model.levers.map((lever) => (
              <div className="grid grid-cols-[92px_1fr] gap-3 p-3 text-sm" key={lever.label}>
                <Badge tone={lever.status === "active" ? "good" : lever.status === "watch" ? "watch" : "neutral"}>{titleCase(lever.status)}</Badge>
                <div>
                  <p className="font-medium">{lever.label}</p>
                  <p className="mt-1 text-muted-foreground">{lever.impact}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border p-4 text-sm leading-6 text-muted-foreground">
            <p>
              Assumptions: WhatsApp text {formatInr(model.assumptions.whatsappTemplateCostInr)} each, cached data group {formatInr(model.assumptions.dataFetchCostPerGroupDayInr)} per day, infra/support buffer {formatInr(model.assumptions.infraBufferPerUserMonthInr)} per user/month.
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}

function ContentPanel({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-4">
        <SegmentPanel icon={Languages} rows={snapshot.operations.languageCoverage} title="Language Coverage" />
        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="text-lg font-semibold">Template Control</h2>
            <p className="text-sm text-muted-foreground">Daily business-initiated text uses approved WhatsApp templates. Voice stays reply-triggered.</p>
          </div>
          <div className="divide-y divide-border">
            {snapshot.templates.map((template) => (
              <article className="p-4" key={`${template.name}-${template.languageCode}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">{template.name}</h3>
                  <StatusBadge status={template.status} />
                  <Badge tone="neutral">{template.languageCode}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{template.body}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {template.variables.map((variable) => (
                    <span className="rounded-md bg-secondary px-2 py-1 font-mono text-xs" key={variable}>
                      {`{{${variable}}}`}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="space-y-4">
        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="text-lg font-semibold">Positive-Only Content Library</h2>
            <p className="text-sm text-muted-foreground">Fallback copy protects the brief when live provider data is incomplete, stale, or unsafe.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm whitespace-nowrap">
              <thead className="bg-secondary text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  {["Category", "Language", "Title", "Body", "Status", "Used"].map((header) => (
                    <th className="border-b border-border px-3 py-2 font-semibold" key={header}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshot.content.map((item) => (
                  <tr className="border-b border-border last:border-b-0" key={item.id}>
                    <td className="px-3 py-2">{titleCase(item.category)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{item.languageCode}</td>
                    <td className="px-3 py-2 font-medium">{item.title}</td>
                    <td className="max-w-[420px] whitespace-normal px-3 py-2 text-muted-foreground">{item.body}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-3 py-2 font-mono">{item.usageCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">Content Safety Rules</h2>
          </div>
          <div className="mt-4 grid gap-2 text-sm">
            {[
              "No negative news, fear, politics, crime, death, disaster, or deterministic predictions.",
              "Markets and zodiac/numerology stay wellness/entertainment only, never advice.",
              "One canonical brief text powers WhatsApp and audio so users receive the same message.",
              "Loved-one/custom voice stays consent, manual review, revocation, deletion, and audit gated.",
            ].map((item) => (
              <div className="flex gap-2 rounded-md bg-secondary p-3" key={item}>
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function AnalyticsPanel({ analytics }: { analytics: DashboardSnapshot["analytics"] }) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <ChartPanel icon={Activity} points={analytics.funnel} title="Activation Funnel" />
      <ChartPanel icon={CheckCircle2} points={analytics.streakCohorts} title="Streak Cohorts" />
      <ChartPanel icon={MessageCircle} points={analytics.delivery} title="Delivery Mix" />
      <ChartPanel icon={Database} points={analytics.costs} title="Pilot Cost Estimate" suffix=" INR" />
    </section>
  );
}

function DbPanel({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">DB Governance Controls</h2>
        <div className="mt-4 grid gap-3 text-sm">
          {[
            "Controlled CRUD through audited APIs for status, retry, and schedule changes.",
            "Reason capture is required for pause, resume, hold, opt-out, retry, and timezone updates.",
            "No destructive raw SQL editor is exposed in the operator dashboard.",
            "Bulk import/export should validate CSV before writing to canonical Postgres records.",
            "Production Vercel runs demo fallback until DATABASE_URL is attached.",
          ].map((item) => (
            <div className="flex gap-2 rounded-md bg-secondary p-3" key={item}>
              <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="text-lg font-semibold">Recent Admin Actions</h2>
          <p className="text-sm text-muted-foreground">Immutable trail for operator changes and sensitive controls.</p>
        </div>
        {snapshot.audit.length ? (
          <div className="divide-y divide-border">
            {snapshot.audit.map((event, index) => (
              <div className="grid gap-1 p-4 text-sm sm:grid-cols-[140px_180px_1fr_170px]" key={`${event.createdAt}-${index}`}>
                <span className="font-medium">{event.actor}</span>
                <span>{titleCase(event.type)}</span>
                <span className="text-muted-foreground">{event.reason}</span>
                <span className="font-mono text-xs text-muted-foreground">{formatStableDateTime(event.createdAt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No admin actions yet" detail="Audited user and delivery actions will appear here." />
        )}
      </div>
    </section>
  );
}

function ChartPanel({
  title,
  points,
  icon: Icon,
  suffix = "",
}: {
  title: string;
  points: AnalyticsPoint[];
  icon: ComponentType<{ className?: string }>;
  suffix?: string;
}) {
  const max = Math.max(...points.map((point) => point.target ?? point.value), 1);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="mt-4 space-y-3">
        {points.map((point) => (
          <div className="grid gap-1" key={point.label}>
            <div className="flex justify-between gap-4 text-sm">
              <span>{point.label}</span>
              <span className="font-mono font-semibold">
                {point.value}
                {suffix}
                {point.target ? <span className="text-muted-foreground"> / {point.target}</span> : null}
              </span>
            </div>
            <div className="h-2 rounded-full bg-secondary">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, (point.value / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SegmentPanel({
  title,
  rows,
  icon: Icon,
}: {
  title: string;
  rows: SegmentRow[];
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {rows.length ? (
        <div className="divide-y divide-border">
          {rows.map((row) => (
            <div className="grid grid-cols-[1fr_auto] gap-3 p-3 text-sm" key={row.label}>
              <div className="min-w-0">
                <p className="truncate font-medium">{row.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{row.detail}</p>
              </div>
              <span className="font-mono text-lg font-semibold">{row.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No segment data" detail="Segments appear when active users exist." />
      )}
    </section>
  );
}

function CostStat({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-secondary p-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-1 text-xs font-semibold",
        /(sent|active|accepted|counted|ready|granted|approved)/.test(normalized) && "bg-primary/10 text-primary",
        /(failed|opted|rejected|revoked)/.test(normalized) && "bg-destructive/10 text-destructive",
        /(paused|hold|pending|draft|onboarding|review)/.test(normalized) && "bg-amber-100 text-amber-900",
        /(skipped|archived)/.test(normalized) && "bg-secondary text-muted-foreground",
      )}
    >
      {titleCase(status)}
    </span>
  );
}

function Badge({ tone, children }: { tone: "good" | "watch" | "bad" | "neutral"; children: ReactNode }) {
  return <span className={cn("inline-flex rounded-md px-2 py-1 text-xs font-semibold", toneBadge(tone))}>{children}</span>;
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground disabled:opacity-35"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function Pill({ icon: Icon, label }: { icon: ComponentType<{ className?: string }>; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="p-6 text-sm">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-muted-foreground">{detail}</p>
    </div>
  );
}

function toneBadge(tone: "good" | "watch" | "bad" | "neutral") {
  return cn(
    tone === "good" && "bg-primary/10 text-primary",
    tone === "watch" && "bg-amber-100 text-amber-900",
    tone === "bad" && "bg-destructive/10 text-destructive",
    tone === "neutral" && "bg-secondary text-muted-foreground",
  );
}

function toneDot(tone: "good" | "watch" | "bad" | "neutral") {
  return cn(
    tone === "good" && "bg-primary",
    tone === "watch" && "bg-amber-500",
    tone === "bad" && "bg-destructive",
    tone === "neutral" && "bg-muted-foreground",
  );
}
