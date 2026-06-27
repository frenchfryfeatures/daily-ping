# Daily Ping

Daily Ping is an isolated B2C pilot app for personalized WhatsApp morning notes and reply-triggered voice notes.

## WhatsApp Delivery Flow

1. The scheduler sends the approved `daily_dose_ready_v1` Utility template with the subscriber name and local date.
2. The subscriber taps the static `Get Daily Dose` quick reply, opening the WhatsApp customer-service window.
3. The webhook sends the canonical full briefing as a service message.
4. When Sarvam is configured, the same canonical text is synthesized, uploaded to WhatsApp, and sent as a voice note.

Provider calls stay simulated until `PILOT_LIVE_SENDS_ENABLED=true`. Demo-seeded users are excluded from scheduling, and the dashboard test action only targets `PILOT_TEST_PHONE`.

## Local Setup

Requirements: Node 20+, Docker, ports `3005` and `5435`.

```bash
cp .env.example .env
npm install
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3005](http://localhost:3005).

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The app defaults to dry-run WhatsApp and TTS behavior until provider credentials are configured and the explicit pilot live-send gate is enabled.

## Dashboard Access

`DASHBOARD_AUTH_ENABLED=true` keeps the dashboard, onboarding, and operator APIs behind HTTP Basic Auth. Set it to `false` only for a temporary test deployment. Public mode exposes subscriber operations and admin controls to anyone with the URL, so re-enable authentication before adding real subscriber data.

## Cost Controls

The dashboard includes a cost desk for the target operating model: 30 WhatsApp text messages plus 30 voice notes per active user each month. These assumptions are environment-controlled:

- `WHATSAPP_TEMPLATE_COST_INR`: delivered WhatsApp template cost assumption for the target market/category.
- `TTS_PROVIDER=sarvam`: enables the Sarvam adapter when `SARVAM_API_KEY` is present; otherwise it safely dry-runs.
- `SARVAM_TTS_MODEL`: use `bulbul:v2` for the scale/default voice path and `bulbul:v3` when premium quality is worth the extra TTS cost.
- `VOICE_NOTES_PER_USER_MONTH`: defaults to `30` for daily voice economics.
- `DATA_FETCH_COST_PER_GROUP_DAY_INR`: models cached weather/news/market fetches by city-language-market group, not per user.

Voice audio remains gated by the WhatsApp service-window rule in this pilot: daily text is template-driven, and audio is sent after the user replies or explicitly requests voice.

## Channel Readiness

The dashboard tracks WhatsApp, Instagram, and Snapchat separately because each platform has different production rules:

- WhatsApp is the primary proactive dispatch channel. It uses a low-cost Utility nudge followed by service-window text and voice delivery after the subscriber taps.
- Instagram is prepared as an interaction-led DM channel. Do not cold-DM daily pings; use comments, story replies, keywords, or approved messaging windows.
- Snapchat is prepared for campaign, lens, and retargeting orchestration. Direct subscriber DM dispatch is treated as platform-gated until an approved path exists.

Additional optional readiness env vars:

- `WHATSAPP_BUSINESS_PHONE_REGISTERED`
- `WHATSAPP_PAYMENT_READY`
- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_BUSINESS_ACCOUNT_ID`
- `INSTAGRAM_PAGE_ID`
- `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`
- `INSTAGRAM_MESSAGING_REVIEW_APPROVED`
- `SNAPCHAT_CLIENT_ID`
- `SNAPCHAT_CLIENT_SECRET`
- `SNAPCHAT_AD_ACCOUNT_ID`
- `SNAPCHAT_REFRESH_TOKEN`
