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
      <LegalSection heading="Acceptance">
        <p>
          By subscribing to Daily Ping you agree to these terms. If you do not agree, reply <strong>STOP</strong> to opt out.
        </p>
      </LegalSection>

      <LegalSection heading="Pilot scope">
        <p>
          Daily Ping is a limited pilot that sends one personalised WhatsApp morning briefing per day to opted-in subscribers. These terms apply to all subscribers and dashboard operators during the pilot.
        </p>
      </LegalSection>

      <LegalSection heading="Wellness and entertainment only">
        <p>
          All content — including weather, markets, gold/silver, zodiac, numerology, affirmations, and kindness tasks — is provided for wellness and entertainment only. It is <strong>not</strong> financial, medical, legal, political, or predictive advice, and no investment, health, or other decision should be made using it. Daily Ping makes no guarantees about outcomes, luck, markets, or predictions.
        </p>
      </LegalSection>

      <LegalSection heading="Opt-in and message frequency">
        <p>
          You opt in by completing onboarding and confirming WhatsApp daily text and reply-triggered voice consent. We send one approved template nudge per day. The full briefing and any voice note are sent only after you tap or reply to open the WhatsApp service window.
        </p>
        <p>
          You can manage your state at any time by replying <strong>VOICE</strong>, <strong>PAUSE</strong>, <strong>RESUME</strong>, <strong>LANGUAGE</strong>, <strong>TIME</strong>, <strong>PROFILE</strong>, or <strong>STOP</strong>. <strong>STOP</strong> revokes consent and stops outbound messages.
        </p>
      </LegalSection>

      <LegalSection heading="Voice notes">
        <p>
          Voice notes use preset voices and are reply-triggered: they are sent only after you request audio in-chat. Any custom or loved-one voice is gated behind a consent artifact, manual operator approval, revocation, deletion, and audit, and may be declined by the operator.
        </p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <p>
          You agree not to misuse the service, spoof numbers, or attempt to access operator credentials or other subscribers’ data. Operators agree to capture a reason and accept an immutable audit event for any admin-sensitive edit.
        </p>
      </LegalSection>

      <LegalSection heading="Limitation of liability">
        <p>
          Daily Ping is provided “as is” without warranties. To the extent permitted by law, liability is limited to the pilot fees paid, if any.
        </p>
      </LegalSection>

      <LegalSection heading="Governing law and contact">
        <p>
          These terms are governed by the laws of India and the courts of Mumbai, Maharashtra. For any question, reply on WhatsApp or contact the Daily Ping pilot operator through the dashboard contact channel.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
