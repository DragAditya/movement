import { describe, expect, it } from "vitest";

const configured = Boolean(process.env.GEMINI_API_KEY);
const suite = configured ? describe : describe.skip;

suite("configured Gemini API key", () => {
  it("can list Google Gemini models without exposing the credential", async () => {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
    });

    expect(response.ok).toBe(true);
    const payload = await response.json() as { models?: unknown[] };
    expect(Array.isArray(payload.models)).toBe(true);
  }, 15_000);
});
