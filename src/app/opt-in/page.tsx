import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata = {
  title: "WhatsApp Opt-in · Daily Ping",
  description: "What you agree to when you opt in to Daily Ping WhatsApp messages and voice notes.",
};

export default function OptInPage() {
  return (
    <LegalPage
      title="WhatsApp Opt-in"
      updated="27 June 2026"
      summary="A plain-language explanation of what you are agreeing to when you opt in to Daily Ping on WhatsApp."
    >
      <LegalSection heading="What you are agreeing to">
        <p>
          By completing onboarding you confirm that you own the WhatsApp number you registered and that you want to receive one personalised Daily Ping morning message each day. You also confirm that you understand voice notes are sent only after you reply or tap to open the WhatsApp service window.
        </p>
      </LegalSection>

      <LegalSection heading="The daily nudge">
        <p>
          Each morning we send an approved WhatsApp Utility template that says your Daily Dose is ready, with your name and the local date. This is a low-cost, template-driven nudge — it does not contain the full briefing.
        </p>
      </LegalSection>

      <LegalSection heading="Getting your full briefing">
        <p>
          When you tap “Get Daily Dose” or reply, you open the WhatsApp customer-service window. We then send the canonical briefing as a service message. The same canonical text is used to generate your voice note if you request audio.
        </p>
      </LegalSection>

      <LegalSection heading="Voice notes and custom voice">
        <p>
          Voice uses preset voices during the pilot. A custom or loved-one voice is never enabled automatically — it needs your consent artifact, manual operator approval, and an audit record, with revocation and deletion available on request.
        </p>
      </LegalSection>

      <LegalSection heading="How to opt out or change things">
        <p>
          Reply STOP to revoke consent and stop all outbound messages, PAUSE to pause temporarily, RESUME to restart, VOICE to request audio, or LANGUAGE / TIME / PROFILE to update your details. Consent records, revocations, and operator actions are stored as immutable audit events.
        </p>
      </LegalSection>

      <LegalSection heading="Wellness and entertainment only">
        <p>
          Daily Ping content is wellness and entertainment. It is not financial, medical, legal, deterministic, political, or fear-based advice. See the Privacy Policy and Terms of Use for the full notice.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
