import { describe, expect, it } from "vitest";
import { canRemoveUploadQueueItem, canRetryUploadQueueItem, resolveInterruptedUpload, resolveUploadResponse } from "./upload-status";

describe("upload result reconciliation", () => {
  it("marks an indexed stored upload as complete", () => {
    expect(resolveUploadResponse(201, { stored: true, persisted: true })).toBe("complete");
  });

  it("routes an accepted duplicate candidate to Needs Review without reconciliation", () => {
    expect(resolveUploadResponse(202, { stored: true, reviewPending: true, reviewId: 91 })).toBe("review");
  });

  it("reconciles a stored image whose database record is still pending", () => {
    expect(resolveUploadResponse(202, { stored: true, persisted: false, key: "gallery/x", url: "/manus-storage/x", filename: "x.png", mimeType: "image/png", fileSize: 42 })).toBe("reconcile");
  });

  it("keeps a stored-but-incomplete response out of the failed state", () => {
    expect(resolveUploadResponse(202, { stored: true, persisted: false })).toBe("stored");
  });

  it("uses checking rather than failed when network confirmation is interrupted", () => {
    expect(resolveInterruptedUpload()).toBe("checking");
  });

  it("reserves failed for a confirmed non-successful response", () => {
    expect(resolveUploadResponse(500, { error: "Storage unavailable" })).toBe("failed");
  });

  it("allows a cancelled upload activity row to be cleared without treating an active upload as removable", () => {
    expect(canRemoveUploadQueueItem("cancelled")).toBe(true);
    expect(canRemoveUploadQueueItem("uploading")).toBe(false);
  });

  it("allows an explicit retry only for failed or cancelled uploads", () => {
    expect(canRetryUploadQueueItem("failed")).toBe(true);
    expect(canRetryUploadQueueItem("cancelled")).toBe(true);
    expect(canRetryUploadQueueItem("checking")).toBe(false);
    expect(canRetryUploadQueueItem("duplicate")).toBe(false);
    expect(canRemoveUploadQueueItem("duplicate")).toBe(false);
  });
});
