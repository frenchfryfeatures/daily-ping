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
      summary="Daily Ping is a WhatsApp wellness and entertainment pilot operated from India. This page explains what data we collect, why, and the choices you have."
    >
      <LegalSection heading="Who we are">
        <p>
          Daily Ping is run by the Daily Ping pilot operator from India. It sends opted-in subscribers one personalised WhatsApp message each morning, with optional voice notes. To use the service, you must be 16 or older and agree to this policy.
        </p>
      </LegalSection>

      <LegalSection heading="Data we collect">
        <p>
          We collect only what is needed to send your briefing: your WhatsApp phone number, display and greeting name, city, region, country, timezone, preferred send time, language, and (optionally) date of birth, zodiac sign, numerology number, interests, and tone/market preferences.
        </p>
        <p>
          We also store the brief text we generate, delivery and streak records, the inbound WhatsApp replies you send us, your consent records, and a temporary audio rendering when you request a voice note.
        </p>
      </LegalSection>

      <LegalSection heading="How we use your data and the WhatsApp Cloud API">
        <p>
          We use your data to compose and deliver your daily message, maintain your streak, honour opt-out and pause requests, and keep an audit trail of operator actions. The daily message is sent through the Meta WhatsApp Cloud API using an approved message template, and reply-triggered messages and voice notes are sent only after you reply or tap a button.
        </p>
        <p>
          We do <strong>not</strong> access your contacts, your private WhatsApp chats, your profile photo, or any other WhatsApp account data beyond what is required to send the messages you requested.
        </p>
      </LegalSection>

      <LegalSection heading="Legal basis and opt-in">
        <p>
          We process your data on the basis of your consent, which you give during onboarding. You can withdraw consent at any time by replying <strong>STOP</strong> (which revokes consent and stops outbound messages), or <strong>PAUSE</strong> / <strong>RESUME</strong> to temporarily pause or restart.
        </p>
      </LegalSection>

      <LegalSection heading="Sharing and processors">
        <p>
          We do not sell your personal data and do not use it for cross-product profiling. To deliver the service, your phone number and message content are transmitted to <strong>Meta</strong> (WhatsApp Cloud API) and, when you request voice, to <strong>Sarvam</strong> (text-to-speech), each acting as a processor under their own terms. We otherwise keep your data within the pilot.
        </p>
      </LegalSection>

      <LegalSection heading="Retention and deletion">
        <p>
          We keep your data for the duration of the pilot. Consent, delivery, and immutable audit records are retained to prove opt-in and accountability. You can request deletion of your identifiable profile and preference data at any time; replying <strong>STOP</strong> revokes active consent immediately.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          You can ask to access, correct, or delete the personal data we hold about you, opt out at any time, and lodge a complaint with a data-protection authority. To exercise any right, reply on WhatsApp or contact the operator below.
        </p>
      </LegalSection>

      <LegalSection heading="Security">
        <p>
          Data is encrypted in transit and stored in a managed database with access limited to the operator. Admin-sensitive changes require a reason and are recorded in an immutable audit log. No method of transmission or storage is fully secure, but we apply reasonable organisational and technical measures.
        </p>
      </LegalSection>

      <LegalSection heading="Children">
        <p>
          Daily Ping is not directed to anyone under 16, and we do not knowingly collect data from children. If you believe a child has subscribed, contact us and we will delete the data.
        </p>
      </LegalSection>

      <LegalSection heading="International transfers">
        <p>
          Because Meta and Sarvam process data in their own regions, your data may be transferred to and processed outside India. Such transfers are subject to the processors’ terms and applicable safeguards.
        </p>
      </LegalSection>

      <LegalSection heading="Changes and contact">
        <p>
          We may update this policy for the pilot and will keep the “Last updated” date current. For any privacy request or question, reply <strong>STOP</strong> on WhatsApp or contact the Daily Ping pilot operator through the dashboard contact channel.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
