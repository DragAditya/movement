import { invokeLLM } from "../server/_core/llm";
import { storageGetSignedUrl } from "../server/storage";

const signedUrl = await storageGetSignedUrl("gallery/originals/5ytL7OGnnHWjsoqkCOZ02-ai-validation-gold-floral-ring_6af4bc9c.jpg");
const result = await invokeLLM({
  model: "gemini-3-flash-preview",
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
      properties: { name: { type: "string" }, description: { type: "string" }, category: { type: "string", enum: ["rings", "necklaces", "earrings", "bangles", "bracelets", "pendants", "sets", "other"] } },
      required: ["name", "description", "category"],
      additionalProperties: false,
    },
  },
});

console.log(JSON.stringify(result, null, 2));
