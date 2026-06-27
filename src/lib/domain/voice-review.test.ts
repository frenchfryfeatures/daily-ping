import { describe, expect, it } from "vitest";
import { canPerformVoiceReviewAction, requiresConsentArtifact } from "./voice-review";

describe("voice review state machine", () => {
  it("allows approving only pending-review profiles", () => {
    expect(canPerformVoiceReviewAction("PENDING_REVIEW", "approve")).toEqual({ ok: true });
    expect(canPerformVoiceReviewAction("APPROVED", "approve")).toEqual({
      ok: false,
      reason: "Only voice profiles in pending review can be approved.",
    });
  });

  it("allows revoking approved or pending profiles but not deleted ones", () => {
    expect(canPerformVoiceReviewAction("APPROVED", "revoke")).toEqual({ ok: true });
    expect(canPerformVoiceReviewAction("PENDING_REVIEW", "revoke")).toEqual({ ok: true });
    expect(canPerformVoiceReviewAction("DELETED", "revoke")).toEqual({
      ok: false,
      reason: "Only approved or pending voice profiles can be revoked.",
    });
  });

  it("allows deleting any non-deleted profile and blocks double delete", () => {
    expect(canPerformVoiceReviewAction("PENDING_REVIEW", "delete")).toEqual({ ok: true });
    expect(canPerformVoiceReviewAction("APPROVED", "delete")).toEqual({ ok: true });
    expect(canPerformVoiceReviewAction("REVOKED", "delete")).toEqual({ ok: true });
    expect(canPerformVoiceReviewAction("DELETED", "delete")).toEqual({
      ok: false,
      reason: "A deleted voice profile cannot be deleted again.",
    });
  });

  it("requires a meaningful label and rejects cloning/impersonation language", () => {
    expect(requiresConsentArtifact("Dadi's voice")).toEqual({ ok: true });
    expect(requiresConsentArtifact("a")).toEqual({
      ok: false,
      reason: "A descriptive label for the custom voice is required.",
    });
    expect(requiresConsentArtifact("clone of famous singer")).toEqual({
      ok: false,
      reason: "Labels implying non-consensual cloning or impersonation are not permitted.",
    });
  });
});
