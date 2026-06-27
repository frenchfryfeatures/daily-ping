"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, CheckCircle2, MessageCircle, ShieldCheck } from "lucide-react";

type SubmissionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const defaultValues = {
  phone: "+918800009999",
  instagramHandle: "@pilot.daily",
  snapchatHandle: "pilotdose",
  preferredChannels: "whatsapp, instagram",
  displayName: "Pilot User",
  firstName: "Pilot",
  city: "Mumbai",
  region: "Maharashtra",
  country: "India",
  timezone: "Asia/Kolkata",
  preferredSendTime: "07:30",
  languageCode: "en",
  languageName: "English",
  dateOfBirth: "1994-08-14",
  zodiacSign: "Leo",
  numerologyNumber: "3",
  marketPreference: "NIFTY 50",
  tonePreference: "warm",
  interests: "family, wellness, markets",
};

export function OnboardingForm() {
  const [state, setState] = useState(defaultValues);
  const [submission, setSubmission] = useState<SubmissionState>({ status: "idle" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmission({ status: "loading" });
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...state,
        numerologyNumber: Number(state.numerologyNumber),
        preferredChannels: state.preferredChannels
          .split(",")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
        interests: state.interests
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        optInDailyText: true,
        optInVoiceReply: true,
      }),
    });
    const data = (await response.json()) as { ok: boolean; error?: string; streakStartsOn?: string };
    if (!response.ok || !data.ok) {
      setSubmission({ status: "error", message: data.error ?? "Onboarding failed." });
      return;
    }
    setSubmission({
      status: "success",
      message: `Onboarded. Streak begins from ${data.streakStartsOn ? new Date(data.streakStartsOn).toDateString() : "the next local day"}.`,
    });
  }

  return (
    <main className="daily-ping-surface min-h-screen p-4 sm:p-6">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="space-y-5 rounded-lg border border-border bg-card p-5">
          <a className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground" href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </a>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">First subscriber interaction</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal">Onboard a Daily Ping pilot user</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Capture opt-in, social reachability, local time, language, city, wellness tone, and enrichment fields before the first streak day begins.
            </p>
          </div>
          <div className="grid gap-3 text-sm">
            <div className="flex gap-3 rounded-md bg-secondary p-3">
              <MessageCircle className="mt-0.5 h-4 w-4 text-primary" />
              <span>Daily text uses the approved WhatsApp template path.</span>
            </div>
            <div className="flex gap-3 rounded-md bg-secondary p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
              <span>Voice note is sent only after the user requests audio in-chat.</span>
            </div>
            <div className="flex gap-3 rounded-md bg-secondary p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <span>Streak starts the next local-calendar day after onboarding.</span>
            </div>
          </div>
        </aside>

        <form className="rounded-lg border border-border bg-card p-5" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["phone", "WhatsApp phone"],
              ["instagramHandle", "Instagram handle"],
              ["snapchatHandle", "Snapchat handle"],
              ["preferredChannels", "Preferred channels"],
              ["displayName", "Display name"],
              ["firstName", "Morning greeting name"],
              ["city", "City"],
              ["region", "Region/state"],
              ["country", "Country"],
              ["timezone", "Timezone"],
              ["preferredSendTime", "Local delivery time"],
              ["languageCode", "Language code"],
              ["languageName", "Language name"],
              ["dateOfBirth", "Date of birth"],
              ["zodiacSign", "Zodiac sign"],
              ["numerologyNumber", "Numerology number"],
              ["marketPreference", "Market preference"],
              ["tonePreference", "Tone preference"],
              ["interests", "Interests"],
            ].map(([key, label]) => (
              <label key={key} className="grid gap-1 text-sm font-medium">
                {label}
                <input
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  name={key}
                  onChange={(event) => setState((current) => ({ ...current, [key]: event.target.value }))}
                  value={state[key as keyof typeof state]}
                />
              </label>
            ))}
          </div>
          <div className="mt-5 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
            Consent captured: WhatsApp daily text, reply-triggered voice note, social-channel follow-up preferences, opt-out rights, and wellness/entertainment framing.
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              disabled={submission.status === "loading"}
              type="submit"
            >
              {submission.status === "loading" ? "Onboarding..." : "Complete onboarding"}
            </button>
            {submission.status === "success" ? <span className="text-sm font-medium text-primary">{submission.message}</span> : null}
            {submission.status === "error" ? <span className="text-sm font-medium text-destructive">{submission.message}</span> : null}
          </div>
        </form>
      </section>
    </main>
  );
}
