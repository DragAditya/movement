export type UploadResponsePayload = {
  persisted?: boolean;
  stored?: boolean;
  key?: string;
  url?: string;
  filename?: string;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  error?: string;
};

export type UploadResolution = "complete" | "reconcile" | "stored" | "failed" | "checking";

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
