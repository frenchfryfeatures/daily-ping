# Daily Ping boundaries

- Keep this product isolated from sibling applications and infrastructure.
- PostgreSQL is the canonical store for user profile, consent, brief, delivery, streak, voice, content, and audit state.
- Daily WhatsApp text is sent through approved templates; voice/audio is sent only after a user opens the service window by replying or tapping.
- Store one canonical brief text and derive both WhatsApp text and TTS audio from it.
- Never enable custom loved-one voice without consent artifact, manual approval, revocation, deletion, and audit records.
- Treat market, zodiac, numerology, and affirmations as wellness/entertainment only. Do not create financial, medical, deterministic, political, or fear-based advice.
- Admin-sensitive edits require reason capture and immutable audit.
