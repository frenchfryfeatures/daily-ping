export type VoiceReviewStatus =
  | "PRESET"
  | "PENDING_CONSENT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REVOKED"
  | "DELETED";

export type VoiceReviewAction = "approve" | "revoke" | "delete";

export type VoiceReviewDecision = { ok: true } | { ok: false; reason: string };

export function canPerformVoiceReviewAction(status: VoiceReviewStatus, action: VoiceReviewAction): VoiceReviewDecision {
  if (action === "approve") {
    return status === "PENDING_REVIEW"
      ? { ok: true }
      : { ok: false, reason: "Only voice profiles in pending review can be approved." };
  }

  if (action === "revoke") {
    return status === "APPROVED" || status === "PENDING_REVIEW"
      ? { ok: true }
      : { ok: false, reason: "Only approved or pending voice profiles can be revoked." };
  }

  return status === "DELETED"
    ? { ok: false, reason: "A deleted voice profile cannot be deleted again." }
    : { ok: true };
}

export function requiresConsentArtifact(label: string): { ok: true } | { ok: false; reason: string } {
  const trimmed = label.trim();
  if (trimmed.length < 2) return { ok: false, reason: "A descriptive label for the custom voice is required." };
  if (/clone|deepfake|impersonat/i.test(trimmed)) {
    return { ok: false, reason: "Labels implying non-consensual cloning or impersonation are not permitted." };
  }
  return { ok: true };
}
