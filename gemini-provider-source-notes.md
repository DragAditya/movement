# Gemini Provider Source Notes

Movement’s personal-provider path follows Google’s Gemini API documentation, consulted on 2026-08-23.

- The official Gemini API documentation recommends the Interactions API for current Gemini capabilities and shows API-key authentication with the `x-goog-api-key` request header: <https://ai.google.dev/gemini-api/docs>.
- The official image-understanding documentation confirms Gemini supports image classification and structured JSON output, and documents passing inline base64 image data for image analysis: <https://ai.google.dev/gemini-api/docs/vision>.
- The official Files API documentation describes resumable server-side media uploads when inline data is unsuitable: <https://ai.google.dev/gemini-api/docs/files>.
- The configured native Gemini key was validated against Google’s `/v1beta/models` endpoint without exposing the key. Its current model list includes `gemini-3.1-flash-lite` and `gemini-3.5-flash-lite`; both are available through `generateContent` for the personal-provider implementation.
