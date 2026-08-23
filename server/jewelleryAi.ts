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

export function resolveJewelleryAlbumSuggestion(category: JewelleryCategory, albums: Array<{ id: number; name: string }>) {
  const label = jewelleryCategoryLabels[category];
  const tokens = category === "other" ? ["other", "design"] : [category.slice(0, -1), category];
  const existing = albums.find(album => {
    const name = album.name.toLowerCase();
    return tokens.some(token => name.includes(token));
  });
  return { existingAlbumId: existing?.id ?? null, newAlbumName: existing ? null : label };
}

function normalizeAnalysis(value: unknown): JewelleryAnalysis {
  const input = value as Partial<JewelleryAnalysis>;
  const category = jewelleryCategories.includes(input.category as JewelleryCategory) ? input.category as JewelleryCategory : "other";
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 80) : "Gold Jewellery Design";
  const description = typeof input.description === "string" ? input.description.trim().slice(0, 110) : "Gold jewellery design.";
  return { name: name || "Gold Jewellery Design", description: description || "Gold jewellery design.", category };
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

export async function analyzeJewelleryImage(input: { originalKey: string; mimeType: string; model: "gemini-3-flash-preview" | "gemini-3.1-pro-preview" }): Promise<JewelleryAnalysis> {
  const models = await listLLMModels();
  const model = models.data.some(item => item.id === input.model) ? input.model : models.data.find(item => item.id === "gemini-3-flash-preview")?.id;
  if (!model) throw new Error("A Gemini vision model is not currently available.");
  const signedUrl = await storageGetSignedUrl(input.originalKey);
  const result = await invokeLLM({
    model,
    maxTokens: 1024,
    messages: [
      { role: "system", content: "You classify one uploaded gold jewellery design. Return only short English product metadata. Do not invent gemstones, purity, price, weight, brand, or cultural claims. Keep name 2 to 5 words in title case. Keep description 2 to 5 words, a simple factual sentence. Choose exactly one jewellery category." },
      { role: "user", content: [{ type: "text", text: "Analyze this jewellery image." }, { type: "image_url", image_url: { url: signedUrl, detail: "low" } }] },
    ],
    outputSchema: {
      name: "jewellery_analysis",
      strict: true,
      schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          category: { type: "string", enum: [...jewelleryCategories] },
        },
        required: ["name", "description", "category"],
        additionalProperties: false,
      },
    },
  });
  const content = result.choices[0]?.message?.content;
  return normalizeAnalysis(typeof content === "string" ? parseModelAnalysis(content) : {});
}

export async function runNewJewelleryAnalysis(imageId: number) {
  const settings = await db.getAiSettings();
  if (!settings.enabled || !settings.autoAnalyzeNew) return { status: "off" as const };
  await db.markImageAiStatus(imageId, "queued");
  try {
    await db.markImageAiStatus(imageId, "analyzing");
    const image = await db.getGalleryImage(imageId);
    const analysis = await analyzeJewelleryImage({ originalKey: image.originalKey, mimeType: image.mimeType, model: settings.model });
    const dashboard = await db.getAlbumDashboard();
    const suggestion = resolveJewelleryAlbumSuggestion(analysis.category, dashboard.albums.filter(album => album.kind === "custom").map(album => ({ id: album.id, name: album.name })));
    await db.saveJewellerySuggestion({ imageId, name: analysis.name, description: analysis.description, suggestedAlbumId: suggestion.existingAlbumId, suggestedNewAlbum: suggestion.newAlbumName, model: settings.model });
    return { status: "ready" as const };
  } catch (error) {
    await db.markImageAiStatus(imageId, "failed", error instanceof Error ? error.message.slice(0, 255) : "AI analysis could not be completed.");
    return { status: "failed" as const };
  }
}
