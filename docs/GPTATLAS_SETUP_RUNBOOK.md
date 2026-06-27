# Daily Ping GPTAtlas Setup Runbook

This runbook is for an autonomous GPT agent that should provision and wire the external dependencies for the `daily-ping` app with minimal user back-and-forth.

## Objective

Set up all production prerequisites required by `apps/daily-ping` so the app can move from demo fallback into a live pilot:

- Production Postgres connected through `DATABASE_URL`
- Vercel production env vars configured
- Meta WhatsApp Cloud API configured
- WhatsApp webhook verified
- WhatsApp template credentials configured
- Sarvam TTS configured
- Scheduler configured to call the protected dispatch endpoint
- Public production URL verified

## Non-goals

- Do not modify sibling apps in `/Users/krishgoyal/Documents/Codex`
- Do not invent alternate product behavior
- Do not enable self-serve custom loved-one voice cloning
- Do not bypass user-owned approvals for billing, business verification, or legal consent

## Required app env vars

These values are required by the current codebase:

- `DATABASE_URL`
- `APP_BASE_URL`
- `ADMIN_BASIC_USER`
- `ADMIN_BASIC_PASSWORD`
- `SCHEDULER_SECRET`
- `PILOT_TEST_PHONE`
- `PILOT_LIVE_SENDS_ENABLED`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_GRAPH_VERSION`
- `WHATSAPP_DAILY_TEMPLATE_NAME`
- `WHATSAPP_DAILY_TEMPLATE_LANGUAGE`
- `TTS_PROVIDER`
- `SARVAM_API_KEY`
- `SARVAM_TTS_MODEL`
- `SARVAM_TTS_SPEAKER`
- `SARVAM_TTS_CODEC`
- `SARVAM_TTS_PACE`
- `WHATSAPP_TEMPLATE_COST_INR`
- `DATA_FETCH_COST_PER_GROUP_DAY_INR`
- `INFRA_BUFFER_PER_USER_MONTH_INR`
- `TARGET_PRICE_PER_USER_MONTH_INR`
- `VOICE_NOTES_PER_USER_MONTH`

## Current product constraints from the code

- The proactive outbound is the approved two-variable `daily_dose_ready_v1` Utility template.
- Full canonical text and voice are sent only after the subscriber taps `Get Daily Dose` and opens the service window.
- WhatsApp media upload is implemented; live voice still requires a working Sarvam key and explicit live-send enablement.
- Demo users are excluded from scheduling, and controlled tests are restricted to `PILOT_TEST_PHONE`.
- Production without `DATABASE_URL` falls back to demo mode.
- Sarvam is the intended TTS provider for scale cost control.

## External accounts and assets to obtain

### 1. Meta / WhatsApp Business Platform

Agent should try to complete all steps it can, and stop only when user approval or account ownership is required.

Needed:

- Meta Business account
- Business verification
- Meta developer app with WhatsApp product
- WhatsApp business phone number
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- approved template names and languages
- webhook callback configuration

Steps:

1. Confirm whether the user already has a Meta Business account and Business Manager access.
2. If not present, guide creation of the account and Business Manager.
3. Complete or initiate business verification.
4. Create a Meta developer app and add the WhatsApp product.
5. Add the production WhatsApp business phone number.
6. Set and submit the WhatsApp display name for review if required.
7. Generate the production access token.
8. Record the phone number ID.
9. Set webhook callback URL to:
   `https://<production-domain>/api/whatsapp/webhook`
10. Set verify token equal to `WHATSAPP_VERIFY_TOKEN`.
11. Create and submit message templates for the active languages.
12. Verify billing is configured in Meta before live sending.

Minimum templates to request:

- English daily morning brief
- Hindi daily morning brief
- Gujarati daily morning brief

### 2. Sarvam

Needed:

- Sarvam account
- `SARVAM_API_KEY`
- billing/credits
- chosen default voice config

Steps:

1. Create or access the Sarvam account.
2. Generate API key.
3. Enable credits or billing.
4. Set:
   - `TTS_PROVIDER=sarvam`
   - `SARVAM_API_KEY`
   - `SARVAM_TTS_MODEL=bulbul:v2`
   - `SARVAM_TTS_SPEAKER=anushka`
   - `SARVAM_TTS_CODEC=mp3`
   - `SARVAM_TTS_PACE=1`
5. Reserve `bulbul:v3` only for premium or sensitive voice cases.

### 3. Postgres

Needed:

- production Postgres instance
- `DATABASE_URL`

Preferred path:

- Vercel Marketplace managed Postgres / Neon

Steps:

1. Provision production Postgres attached to the `daily-ping` Vercel project.
2. Add `DATABASE_URL` to Vercel production env vars.
3. Run Prisma migrations against production.
4. Verify the dashboard no longer shows demo fallback.

### 4. Vercel

Needed:

- linked Vercel project for `apps/daily-ping`
- production env vars
- stable public URL

Steps:

1. Confirm project is linked to the correct isolated app.
2. Set all required env vars.
3. Set `APP_BASE_URL` to the stable production URL.
4. Deploy production.
5. Verify:
   - `/dashboard` returns `200`
   - `/api/whatsapp/webhook` accepts Meta verification
   - demo fallback disappears once DB is attached

### 5. Scheduler

Needed:

- cron source
- `SCHEDULER_SECRET`

Steps:

1. Create a long random `SCHEDULER_SECRET`.
2. Configure a cron source to `POST`:
   `https://<production-domain>/api/scheduler/dispatch-due-briefs`
3. Send header:
   `x-scheduler-secret: <secret>`
4. Run every 5 to 15 minutes.

## Still missing for full production completeness

These are not fully wired in the current code and should be treated as explicit follow-up scope, not silently assumed complete:

- live weather API
- live market/index API
- live gold/silver data API
- live positive regional news feed
- production WhatsApp audio media upload/send path
- privacy policy / terms / opt-in legal text finalization
- manual review workflow for loved-one voice requests

## Operating rules for the GPTAtlas agent

- Work only inside `apps/daily-ping`.
- Prefer executing setup directly when access is available.
- Ask the user only for unavoidable approvals:
  - Meta business verification
  - billing enablement
  - OTP or phone ownership checks
  - legal/business documents
  - secret values that only the user owns
- Keep a running checklist of:
  - acquired
  - pending user approval
  - blocked externally
  - verified live
- After each external setup step, write down:
  - what was configured
  - what exact env var or ID was obtained
  - what URL or endpoint was verified

## Copy-paste prompt for GPTAtlas

Use the block below as the exact kickoff prompt for GPTAtlas.

```text
You are the execution agent for the Daily Ping app located at /Users/krishgoyal/Documents/Codex/apps/daily-ping.

Your job is to complete the production prerequisite setup end to end, not just describe it.

Goal:
- Move the app from demo fallback into a live pilot-ready state by provisioning or wiring all external dependencies the current code expects.

Work boundaries:
- Only work on apps/daily-ping.
- Do not modify or redeploy sibling apps.
- Do not widen scope into unrelated product ideas.

What the code currently requires:
- DATABASE_URL
- APP_BASE_URL
- ADMIN_BASIC_USER
- ADMIN_BASIC_PASSWORD
- SCHEDULER_SECRET
- PILOT_TEST_PHONE
- PILOT_LIVE_SENDS_ENABLED
- WHATSAPP_VERIFY_TOKEN
- WHATSAPP_ACCESS_TOKEN
- WHATSAPP_PHONE_NUMBER_ID
- WHATSAPP_GRAPH_VERSION
- WHATSAPP_DAILY_TEMPLATE_NAME
- WHATSAPP_DAILY_TEMPLATE_LANGUAGE
- TTS_PROVIDER
- SARVAM_API_KEY
- SARVAM_TTS_MODEL
- SARVAM_TTS_SPEAKER
- SARVAM_TTS_CODEC
- SARVAM_TTS_PACE

External setup to complete:
1. Production Postgres
2. Vercel env vars
3. Meta WhatsApp Cloud API
4. WhatsApp webhook
5. WhatsApp approved templates
6. Sarvam TTS
7. Scheduler/cron
8. Live verification of the deployed app

Important product constraints from the app:
- Daily outbound text is template-driven.
- Voice is reply-triggered inside the WhatsApp service window.
- If DATABASE_URL is missing the app stays in demo fallback.
- Sarvam is the intended scale TTS provider.
- Live WhatsApp voice media send is not fully completed until media hosting/upload compliance is implemented, so treat that as a tracked follow-up if code changes are required.

How to operate:
- Inspect the codebase first and use the actual env contract from .env.example.
- Execute setup steps directly when you have access.
- Only stop for user input when account ownership, billing, OTP, legal docs, or business verification requires it.
- Keep a checklist with these states: acquired, pending user approval, blocked externally, verified live.
- After each step, report exactly what was obtained or configured.
- Verify live behavior after each meaningful setup change.

Success criteria:
- Production Postgres attached and DATABASE_URL set
- WhatsApp credentials configured
- webhook verified
- at least one approved daily template configured for the active language
- Sarvam API key configured
- scheduler configured
- production /dashboard verified
- app no longer depends on demo fallback for core persistence
```
