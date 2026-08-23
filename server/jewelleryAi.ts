import { invokeLLM, listLLMModels } from "./_core/llm";
import { storageGetSignedUrl } from "./storage";
import * as db from "./db";

export const jewelleryCategories = ["rings", "necklaces", "earrings", "bangles", "bracelets", "pendants", "sets", "other"] as const;
export type JewelleryCategory = (typeof jewelleryCategories)[number];

export const jewelleryCategoryLabels: Record<JewelleryCategory, string> = {
  rings: "Rings",
  necklaces: "Necklaces",
  earrings: "Earrings",
  bangles: "Bangles",
  bracelets: "Bracelets",
  pendants: "Pendants",
  sets: "Sets",
  other: "Other Designs",
};

export type JewelleryAnalysis = {
  name: string;
  description: string;
  category: JewelleryCategory;
};

export const builtinGeminiModels = ["gemini-3-flash-preview", "gemini-3.1-pro-preview"] as const;
export const personalGeminiModels = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite"] as const;

const explicitCategoryMatchers: Array<[JewelleryCategory, RegExp]> = [
  ["rings", /\bring(s)?\b/i],
  ["necklaces", /\bnecklace(s)?\b/i],
  ["earrings", /\bearring(s)?\b/i],
  ["bangles", /\bbangle(s)?\b/i],
  ["bracelets", /\bbracelet(s)?\b/i],
  ["pendants", /\bpendant(s)?\b/i],
  ["sets", /\b(set|matching set)\b/i],
];

const jewelleryInstructions = "You classify one uploaded gold jewellery design. Inspect only the visible design, never the filename or a suggested album. Return one short English name, one factual 2–5 word English description, and exactly one category. Do not invent gemstones, purity, price, weight, brand, cultural claims, or parts that are not visibly clear. A pendant must be a clearly separate hanging ornament, usually with a bail or chain attachment; do not call a ring, earring, necklace, bangle, bracelet, or unrelated image a pendant. If the jewellery type is uncertain, use other.";

const analysisSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    category: { type: "string", enum: [...jewelleryCategories] },
  },
  required: ["name", "description", "category"],
  additionalProperties: false,
} as const;

const personalAnalysisSchema = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    description: { type: "STRING" },
    category: { type: "STRING", enum: [...jewelleryCategories] },
  },
  required: ["name", "description", "category"],
} as const;

export function resolveJewelleryAlbumSuggestion(category: JewelleryCategory, albums: Array<{ id: number; name: string }>) {
  const label = jewelleryCategoryLabels[category];
  const tokens = category === "other" ? ["other", "design", "designs"] : [category.slice(0, -1), category];
  const existing = albums.find(album => {
    const words = album.name.toLowerCase().match(/[a-z]+/g) ?? [];
    return words.some(word => tokens.includes(word));
  });
  return { existingAlbumId: existing?.id ?? null, newAlbumName: existing ? null : label };
}

export function resolveProviderModel(provider: db.AiProvider, requested: db.AiModel) {
  if (provider === "personal") return (personalGeminiModels as readonly string[]).includes(requested) ? requested : "gemini-3.1-flash-lite";
  return (builtinGeminiModels as readonly string[]).includes(requested) ? requested : "gemini-3-flash-preview";
}

export function reconcileJewelleryCategory(category: JewelleryCategory, name: string, description: string): JewelleryCategory {
  const explicit = explicitCategoryMatchers.find(([, matcher]) => matcher.test(`${name} ${description}`))?.[0];
  return explicit ?? category;
}

function normalizeAnalysis(value: unknown): JewelleryAnalysis {
  const input = value as Partial<JewelleryAnalysis>;
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 80) : "Gold Jewellery Design";
  const description = typeof input.description === "string" ? input.description.trim().slice(0, 110) : "Gold jewellery design.";
  const resolvedName = name || "Gold Jewellery Design";
  const resolvedDescription = description || "Gold jewellery design.";
  const modelCategory = jewelleryCategories.includes(input.category as JewelleryCategory) ? input.category as JewelleryCategory : "other";
  return { name: resolvedName, description: resolvedDescription, category: reconcileJewelleryCategory(modelCategory, resolvedName, resolvedDescription) };
}

export function parseModelAnalysis(content: string): unknown {
  const trimmed = content.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const field = (key: string) => trimmed.match(new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)(?:"\\s*,|"\\s*})`))?.[1]?.replace(/\s+/g, " ").trim();
    const name = field("name");
    const description = field("description");
    const category = field("category");
    if (name && description && category) return { name, description, category };
    throw new Error("Gemini returned an invalid jewellery analysis response.");
  }
}

async function analyzeWithBuiltInGemini(input: { originalKey: string; mimeType: string; model: string }): Promise<JewelleryAnalysis> {
  const models = await listLLMModels();
  const model = models.data.some(item => item.id === input.model) ? input.model : models.data.find(item => item.id === "gemini-3-flash-preview")?.id;
  if (!model) throw new Error("A built-in Gemini vision model is not currently available.");
  const signedUrl = await storageGetSignedUrl(input.originalKey);
  const result = await invokeLLM({
    model,
    maxTokens: 1024,
    messages: [
      { role: "system", content: jewelleryInstructions },
      { role: "user", content: [{ type: "text", text: "Analyze this jewellery image." }, { type: "image_url", image_url: { url: signedUrl, detail: "low" } }] },
    ],
    outputSchema: { name: "jewellery_analysis", strict: true, schema: analysisSchema },
  });
  const content = result.choices[0]?.message?.content;
  return normalizeAnalysis(typeof content === "string" ? parseModelAnalysis(content) : {});
}

async function analyzeWithPersonalGemini(input: { originalKey: string; mimeType: string; model: string }): Promise<JewelleryAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Add a personal Gemini API key in the secure project settings before using this provider.");
  const signedUrl = await storageGetSignedUrl(input.originalKey);
  const imageResponse = await fetch(signedUrl);
  if (!imageResponse.ok) throw new Error("The uploaded image could not be prepared for Gemini analysis.");
  const bytes = Buffer.from(await imageResponse.arrayBuffer());
  if (bytes.byteLength > 18 * 1024 * 1024) throw new Error("This image is too large for personal Gemini inline analysis. Use an image below 18 MB.");

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${jewelleryInstructions} Analyze this jewellery image.` }, { inline_data: { mime_type: input.mimeType, data: bytes.toString("base64") } }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: personalAnalysisSchema, temperature: 0.1, maxOutputTokens: 1024 },
    }),
  });
  if (!response.ok) throw new Error(`Personal Gemini analysis failed (${response.status}).`);
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const content = payload.candidates?.[0]?.content?.parts?.find(part => typeof part.text === "string")?.text;
  return normalizeAnalysis(typeof content === "string" ? parseModelAnalysis(content) : {});
}

export async function analyzeJewelleryImage(input: { originalKey: string; mimeType: string; provider: db.AiProvider; model: db.AiModel }): Promise<JewelleryAnalysis> {
  const model = resolveProviderModel(input.provider, input.model);
  return input.provider === "personal"
    ? analyzeWithPersonalGemini({ ...input, model })
    : analyzeWithBuiltInGemini({ ...input, model });
}

async function runJewelleryAnalysis(imageId: number, settings: Awaited<ReturnType<typeof db.getAiSettings>>) {
  await db.markImageAiStatus(imageId, "queued");
  try {
    await db.markImageAiStatus(imageId, "analyzing");
    const image = await db.getGalleryImage(imageId);
    const analysis = await analyzeJewelleryImage({ originalKey: image.originalKey, mimeType: image.mimeType, provider: settings.provider, model: settings.model });
    const dashboard = await db.getAlbumDashboard();
    const suggestion = resolveJewelleryAlbumSuggestion(analysis.category, dashboard.albums.filter(album => album.kind === "custom").map(album => ({ id: album.id, name: album.name })));
    await db.saveJewellerySuggestion({ imageId, name: analysis.name, description: analysis.description, suggestedAlbumId: suggestion.existingAlbumId, suggestedNewAlbum: suggestion.newAlbumName, model: resolveProviderModel(settings.provider, settings.model) });
    return { imageId, status: "ready" as const };
  } catch (error) {
    await db.markImageAiStatus(imageId, "failed", error instanceof Error ? error.message.slice(0, 255) : "AI analysis could not be completed.");
    return { imageId, status: "failed" as const };
  }
}

export async function runNewJewelleryAnalysis(imageId: number) {
  const settings = await db.getAiSettings();
  if (!settings.enabled || !settings.autoAnalyzeNew) return { imageId, status: "off" as const };
  const [unorganised] = await db.getUnorganisedGalleryImages([imageId]);
  if (!unorganised) return { imageId, status: "skipped" as const };
  return runJewelleryAnalysis(imageId, settings);
}

export async function runJewelleryBatch(imageIds: number[]) {
  const settings = await db.getAiSettings();
  if (!settings.enabled) return { status: "off" as const, results: [] };
  const uniqueIds = Array.from(new Set(imageIds));
  if (!uniqueIds.length) return { status: "empty" as const, results: [] };
  if (uniqueIds.length > settings.batchSize) throw new Error(`Choose up to ${settings.batchSize} unorganised images per Gemini batch.`);
  const unorganised = await db.getUnorganisedGalleryImages(uniqueIds);
  const results = [];
  for (const image of unorganised) results.push(await runJewelleryAnalysis(image.id, settings));
  return { status: results.some(result => result.status === "ready") ? "complete" as const : "failed" as const, results, skippedIds: uniqueIds.filter(id => !unorganised.some(image => image.id === id)) };
}
