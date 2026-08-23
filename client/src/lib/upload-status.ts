export type UploadResponsePayload = {
  persisted?: boolean;
  stored?: boolean;
  key?: string;
  url?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  filename?: string;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  imageId?: number;
  replaced?: boolean;
  contentHash?: string;
  visualHash?: string;
  duplicate?: {
    kind: "exact" | "similar";
    distance: number;
    similarity: number;
    image: { id: number; filename: string; originalUrl: string; thumbnailUrl?: string | null; previewUrl?: string | null; width?: number | null; height?: number | null; createdAt: string };
  };
  error?: string;
};

export type UploadResolution = "complete" | "reconcile" | "stored" | "failed" | "checking";
export type UploadQueueStatus = "pending" | "uploading" | "indexing" | "stored" | "complete" | "failed" | "checking" | "cancelled" | "duplicate";

export function resolveUploadResponse(status: number, payload: UploadResponsePayload): UploadResolution {
  if (status >= 200 && status < 300 && payload.stored) {
    if (payload.persisted) return "complete";
    if (payload.key && payload.url && payload.filename && payload.mimeType && payload.fileSize) return "reconcile";
    return "stored";
  }
  return "failed";
}

export function resolveInterruptedUpload(): "checking" {
  return "checking";
}

export function isCompletedUploadQueueItem(status: UploadQueueStatus) {
  return status === "complete" || status === "stored";
}

export function canRemoveUploadQueueItem(status: UploadQueueStatus) {
  return isCompletedUploadQueueItem(status) || status === "cancelled";
}

export function canRetryUploadQueueItem(status: UploadQueueStatus) {
  return status === "failed" || status === "cancelled";
}
