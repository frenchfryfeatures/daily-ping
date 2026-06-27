import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata = {
  title: "Privacy Policy · Daily Ping",
  description: "How Daily Ping collects, uses, and protects pilot subscriber data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="27 June 2026"
      summary="How Daily Ping collects, uses, stores, and protects personal data during the India WhatsApp pilot."
    >
      <LegalSection heading="What we collect">
        <p>
          To send a personalised morning briefing we collect your WhatsApp phone number, display and greeting name, city, region, country, timezone, preferred send time, language, date of birth (optional), zodiac sign (optional), numerology number (optional), market and tone preferences, interests, and the social handles you choose to share.
        </p>
        <p>
          We also store the brief text we generate for you, delivery and streak records, inbound WhatsApp messages you send us, and your consent records. When you request a voice note, we store a temporary audio rendering of the canonical brief.
        </p>
      </LegalSection>

      <LegalSection heading="How we use it">
        <p>
          Your data is used to compose and deliver one daily WhatsApp message, to maintain your streak, to honour your opt-out and pause requests, and to operate the pilot dashboard. Demo and seed records are isolated from scheduling and never receive provider messages.
        </p>
        <p>
          Weather, market, gold/silver, and positive-news data are fetched and cached by city, language, and market group so that many subscribers share one fetch. We do not sell your data and do not use it for cross-product profiling.
        </p>
      </LegalSection>

      <LegalSection heading="Voice notes and the WhatsApp service window">
        <p>
          The daily text is sent using an approved WhatsApp Utility template. A voice note is generated and sent only after you open the customer-service window by replying or tapping a button. We keep one canonical brief text and derive both the WhatsApp text and the voice audio from it.
        </p>
      </LegalSection>

      <LegalSection heading="Custom or loved-one voice">
        <p>
          A custom or loved-one voice is never enabled automatically. It requires a consent artifact, manual operator approval, an auditable approval record, and the ability to revoke or delete on request. Until all four exist, the pilot uses preset voices only. You can request revocation or deletion of a custom voice at any time by replying STOP or contacting the operator.
        </p>
      </LegalSection>

      <LegalSection heading="Retention and deletion">
        <p>
          Consent records, delivery attempts, and immutable audit events are retained for the pilot lifetime to prove opt-in and operator accountability. You can request deletion of identifiable profile and preference data, and opt-out revokes active consent immediately. Deletion of a custom voice profile is recorded in the audit log.
        </p>
      </LegalSection>

      <LegalSection heading="Wellness and entertainment only">
        <p>
          Zodiac, numerology, affirmations, market, and gold/silver lines are wellness and entertainment content. They are not financial, medical, legal, deterministic, political, or fear-based advice, and no investment or health decision should be made using them.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          For privacy requests including access, correction, revocation, or deletion, reply STOP on WhatsApp or contact the pilot operator through the dashboard contact channel. Admin-sensitive changes are logged with a reason and an immutable audit event.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
