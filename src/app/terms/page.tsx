import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata = {
  title: "Terms of Use · Daily Ping",
  description: "Terms governing use of the Daily Ping WhatsApp wellness pilot.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      updated="27 June 2026"
      summary="The terms that govern your use of the Daily Ping WhatsApp wellness and entertainment pilot."
    >
      <LegalSection heading="Pilot scope">
        <p>
          Daily Ping is a limited pilot that sends one personalised WhatsApp morning briefing per day to opted-in subscribers. These terms apply to all subscribers and dashboard operators during the pilot.
        </p>
      </LegalSection>

      <LegalSection heading="Wellness and entertainment only">
        <p>
          All content — including weather, market, gold/silver, zodiac, numerology, affirmations, and kindness tasks — is provided for wellness and entertainment. It is not financial, medical, legal, deterministic, political, or fear-based advice. You are responsible for any decisions you make, and Daily Ping makes no guarantees about outcomes, luck, markets, or predictions.
        </p>
      </LegalSection>

      <LegalSection heading="Opt-in and message frequency">
        <p>
          You opt in by completing onboarding and confirming WhatsApp daily text and reply-triggered voice consent. The pilot sends one approved Utility template nudge per day. The full briefing and any voice note are sent only after you tap or reply to open the WhatsApp service window.
        </p>
        <p>
          You can manage frequency and state by replying VOICE, PAUSE, RESUME, LANGUAGE, TIME, PROFILE, or STOP at any time. STOP revokes consent and stops outbound messages.
        </p>
      </LegalSection>

      <LegalSection heading="Voice and custom voice">
        <p>
          Voice notes use preset voices during the pilot. A custom or loved-one voice is gated behind a consent artifact, manual operator approval, revocation, deletion, and audit. The pilot operator may decline a custom-voice request. Live voice sending depends on provider availability and explicit live-send enablement.
        </p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <p>
          You agree not to misuse the service, spoof numbers, or attempt to extract operator credentials or other subscribers’ data. Operators agree to capture a reason and accept an immutable audit event for any admin-sensitive edit.
        </p>
      </LegalSection>

      <LegalSection heading="Limitation and jurisdiction">
        <p>
          Daily Ping is provided “as is” without warranties. To the extent permitted by law, liability is limited to the pilot fees paid, if any. These terms are governed by the laws of India and the courts of Mumbai, Maharashtra.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
