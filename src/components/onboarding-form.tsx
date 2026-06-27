"use client";

import { useState } from "react";
import type { ComponentType, FormEvent, ReactNode } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Heart,
  Languages,
  MapPin,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  User2,
} from "lucide-react";

type SubmissionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const languages = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "gu", name: "Gujarati" },
  { code: "mr", name: "Marathi" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "kn", name: "Kannada" },
  { code: "ml", name: "Malayalam" },
  { code: "bn", name: "Bengali" },
  { code: "pa", name: "Punjabi" },
  { code: "or", name: "Odia" },
];

const markets = ["NIFTY 50", "SENSEX", "NIFTY BANK", "GOLD", "SILVER"];
const tones = [
  { value: "warm", label: "Warm & encouraging" },
  { value: "calm", label: "Calm & steady" },
  { value: "energetic", label: "Energetic & upbeat" },
];
const timezones = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
];
const zodiacs = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra",
  "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const emptyForm = {
  displayName: "",
  firstName: "",
  phone: "",
  city: "",
  country: "India",
  timezone: "Asia/Kolkata",
  preferredSendTime: "07:30",
  dateOfBirth: "",
  languageCode: "en",
  marketPreference: "NIFTY 50",
  tonePreference: "warm",
  interests: "",
  zodiacSign: "",
  numerologyNumber: "",
  optInDailyText: false,
  optInVoiceReply: false,
  wellnessAck: false,
};

export function OnboardingForm() {
  const [form, setForm] = useState(emptyForm);
  const [submission, setSubmission] = useState<SubmissionState>({ status: "idle" });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const consentComplete = form.optInDailyText && form.optInVoiceReply && form.wellnessAck;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consentComplete) {
      setSubmission({ status: "error", message: "Please confirm all three consent checkboxes to continue." });
      return;
    }
    setSubmission({ status: "loading" });
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: form.displayName.trim(),
        firstName: form.firstName.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        region: "",
        timezone: form.timezone,
        preferredSendTime: form.preferredSendTime,
        dateOfBirth: form.dateOfBirth || undefined,
        languageCode: form.languageCode,
        languageName: languages.find((lang) => lang.code === form.languageCode)?.name ?? "English",
        marketPreference: form.marketPreference,
        tonePreference: form.tonePreference,
        interests: form.interests
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        zodiacSign: form.zodiacSign || undefined,
        numerologyNumber: form.numerologyNumber ? Number(form.numerologyNumber) : undefined,
        preferredChannels: ["whatsapp"],
        optInDailyText: true,
        optInVoiceReply: true,
      }),
    });
    const data = (await response.json()) as { ok: boolean; error?: string; streakStartsOn?: string };
    if (!response.ok || !data.ok) {
      setSubmission({ status: "error", message: data.error ?? "Onboarding failed. Please check your details and try again." });
      return;
    }
    setSubmission({
      status: "success",
      message: `You're in. Your first Daily Ping streak begins ${data.streakStartsOn ? new Date(data.streakStartsOn).toDateString() : "the next local day"}. Watch WhatsApp for tomorrow's nudge.`,
    });
    setForm(emptyForm);
  }

  return (
    <main className="daily-ping-surface min-h-screen p-4 sm:p-6">
      <section className="mx-auto max-w-3xl space-y-6">
        <header className="rounded-lg border border-border bg-card p-6">
          <a className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground" href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </a>
          <div className="mt-5 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Start your Daily Ping</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                One personalised WhatsApp message each morning — weather, markets, a positive note, and a kind task. Voice on request.
              </p>
            </div>
          </div>
        </header>

        <form className="space-y-6" onSubmit={submit}>
          <Section icon={User2} title="About you" subtitle="So every ping feels like it's written for you.">
            <Field label="Display name" required>
              <input className={inputClass} required value={form.displayName} onChange={(e) => update("displayName", e.target.value)} placeholder="e.g. Krish Goyal" />
            </Field>
            <Field label="Morning greeting name" required hint="Used in the greeting — usually your first name.">
              <input className={inputClass} required value={form.firstName} onChange={(e) => update("firstName", e.target.value)} placeholder="e.g. Krish" />
            </Field>
            <Field label="WhatsApp number" required hint="Include country code. This is where we send your Daily Ping.">
              <input className={inputClass} type="tel" required value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91 98765 43210" />
            </Field>
            <Field label="City" required>
              <input className={inputClass} required value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="e.g. Mumbai" />
            </Field>
            <Field label="Country" required>
              <input className={inputClass} required value={form.country} onChange={(e) => update("country", e.target.value)} placeholder="India" />
            </Field>
            <Field label="Date of birth" hint="Optional — powers your zodiac & numerology line.">
              <input className={inputClass} type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
            </Field>
          </Section>

          <Section icon={Clock3} title="When & where" subtitle="We deliver in your local time, once each morning.">
            <Field label="Timezone" required>
              <select className={inputClass} required value={form.timezone} onChange={(e) => update("timezone", e.target.value)}>
                {(timezones.includes(form.timezone) ? timezones : [form.timezone, ...timezones]).map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </Field>
            <Field label="Preferred delivery time" required hint="Local time, 24-hour. Most users pick 07:00–09:00.">
              <input className={inputClass} type="time" required value={form.preferredSendTime} onChange={(e) => update("preferredSendTime", e.target.value)} />
            </Field>
          </Section>

          <Section icon={Languages} title="Your daily brief" subtitle="Personalise the sections you receive.">
            <Field label="Language" required>
              <select className={inputClass} required value={form.languageCode} onChange={(e) => update("languageCode", e.target.value)}>
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Market to follow" required hint="Shown as info only — never financial advice.">
              <select className={inputClass} required value={form.marketPreference} onChange={(e) => update("marketPreference", e.target.value)}>
                {markets.map((market) => (
                  <option key={market} value={market}>{market}</option>
                ))}
              </select>
            </Field>
            <Field label="Tone" required>
              <select className={inputClass} required value={form.tonePreference} onChange={(e) => update("tonePreference", e.target.value)}>
                {tones.map((tone) => (
                  <option key={tone.value} value={tone.value}>{tone.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Interests" hint="Optional, comma-separated. Helps us pick relevant positive news.">
              <input className={inputClass} value={form.interests} onChange={(e) => update("interests", e.target.value)} placeholder="family, wellness, cricket, books" />
            </Field>
            <Field label="Zodiac sign" hint="Optional. Auto-filled if you add your date of birth.">
              <select className={inputClass} value={form.zodiacSign} onChange={(e) => update("zodiacSign", e.target.value)}>
                <option value="">Skip</option>
                {zodiacs.map((sign) => (
                  <option key={sign} value={sign}>{sign}</option>
                ))}
              </select>
            </Field>
            <Field label="Numerology number" hint="Optional, 1–9.">
              <input className={inputClass} type="number" min={1} max={9} value={form.numerologyNumber} onChange={(e) => update("numerologyNumber", e.target.value)} placeholder="e.g. 5" />
            </Field>
          </Section>

          <Section icon={ShieldCheck} title="Your consent" subtitle="You stay in control. Opt out anytime by replying STOP, PAUSE, or RESUME.">
            <ConsentCheckbox
              checked={form.optInDailyText}
              onChange={(v) => update("optInDailyText", v)}
              label="I agree to receive one Daily Ping WhatsApp message each morning using an approved template."
            />
            <ConsentCheckbox
              checked={form.optInVoiceReply}
              onChange={(v) => update("optInVoiceReply", v)}
              label="I agree to receive a voice note when I request audio by replying. Voice is sent only after I reply."
            />
            <ConsentCheckbox
              checked={form.wellnessAck}
              onChange={(v) => update("wellnessAck", v)}
              label="I understand Daily Ping is wellness & entertainment — not financial, medical, or predictive advice."
            />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <a className="hover:text-foreground" href="/opt-in">WhatsApp opt-in</a>
              <a className="hover:text-foreground" href="/privacy">Privacy policy</a>
              <a className="hover:text-foreground" href="/terms">Terms of use</a>
            </div>
          </Section>

          <div className="rounded-lg border border-border bg-card p-5">
            <button
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:w-auto"
              disabled={submission.status === "loading" || !consentComplete}
              type="submit"
            >
              <Send className="h-4 w-4" />
              {submission.status === "loading" ? "Starting your Daily Ping..." : "Start my Daily Ping"}
            </button>
            {!consentComplete ? (
              <p className="mt-3 text-xs text-muted-foreground">Confirm all three consent boxes to enable the button.</p>
            ) : null}
            {submission.status === "success" ? (
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary">
                <CheckCircle2 className="h-4 w-4" />
                {submission.message}
              </p>
            ) : null}
            {submission.status === "error" ? (
              <p className="mt-3 text-sm font-medium text-destructive">{submission.message}</p>
            ) : null}
          </div>
        </form>

        <footer className="grid gap-3 sm:grid-cols-3">
          <FooterNote icon={MessageCircle} text="Daily text uses an approved WhatsApp template." />
          <FooterNote icon={MapPin} text="Local time + language make each ping personal." />
          <FooterNote icon={Heart} text="Positive-only: no fear, politics, or doom." />
        </footer>
      </section>
    </main>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3 border-b border-border pb-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-secondary text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      <span>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function ConsentCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background p-3 text-sm">
      <input
        className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="leading-5 text-foreground/90">{label}</span>
    </label>
  );
}

function FooterNote({ icon: Icon, text }: { icon: ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
      <Icon className="h-4 w-4 text-primary" />
      <span>{text}</span>
    </div>
  );
}
