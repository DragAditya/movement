# Movement

> A premium, image-first gallery for uploading, organizing, reviewing, and presenting image collections.

**Movement** is a React, TypeScript, Express, and MySQL-compatible gallery application built around real uploaded images rather than placeholders. It includes a public gallery, a publicly accessible Studio workspace, responsive image delivery, immersive slideshows, approval-only Gemini suggestions, and a durable duplicate-review queue.

| Area | Included behavior |
| --- | --- |
| **Gallery and albums** | Real uploaded images, permanent All Images view, custom albums, one custom album per image, covers, descriptions, ordering, visibility, and permanent deletion. |
| **Studio uploads** | Drag-and-drop uploads, progress, cancellation, retry, compact previews, safe reconciliation, and responsive mobile controls. |
| **Vercel-safe media transfer** | A browser uploads the image directly to private Backblaze B2 using a short-lived URL; the serverless function then creates derivatives, fingerprints it, and performs indexing. |
| **Duplicate protection** | Exact SHA-256 and visual fingerprints place exact or visually similar uploads in a durable **Needs Review** queue rather than silently losing them. |
| **Gemini suggestions** | A personal Gemini key can generate editable short jewellery names, descriptions, and one album idea. Nothing moves or changes an album until it is approved. |
| **Presentation** | Responsive public galleries and Standard, Immersive, and Kiosk slideshow modes with full-image containment. |

## Technology

| Layer | Implementation |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, Radix UI, Wouter |
| Application API | Express 4 and tRPC 11, exported from `api/index.ts` for Vercel |
| Database | TiDB Cloud Starter through Drizzle ORM and TLS-protected MySQL connections |
| Media | Private Backblaze B2 bucket, signed `/media/*` redirects, thumbnails, and previews |
| AI | Server-side Gemini integration using `GEMINI_API_KEY`; keys never reach the browser |

## Run locally

Install Node.js 22 or later and [pnpm](https://pnpm.io/installation). For the full external-hosting mode, supply a TiDB-compatible database, a Backblaze B2 bucket, and a Gemini API key.

```bash
pnpm install
pnpm dev
```

Before opening a pull request or deploying, run the complete verification sequence:

```bash
pnpm test
pnpm check
pnpm build
```

## Vercel deployment

The root [`vercel.json`](./vercel.json) serves Vite’s static output, forwards `/api/*` and `/media/*` to the Express entry point, and preserves SPA navigation. Studio intentionally remains public, matching the current product behavior; no new authentication provider or login screen is required.

### Required Vercel environment variables

Add the following **server-only** variables in **Project Settings → Environment Variables**. Use Production and Preview at a minimum. Never commit their values or paste them into GitHub issues.

| Variable | Purpose |
| --- | --- |
| `TIDB_DATABASE_URL` | Full TLS connection string for the TiDB `movement_gallery` database. |
| `B2_S3_KEY_ID` | Bucket-scoped Backblaze B2 application key ID. |
| `B2_S3_APPLICATION_KEY` | Bucket-scoped Backblaze B2 application key. |
| `GEMINI_API_KEY` | Personal Gemini API key used by the existing approval-only suggestion flow. |

The external adapters activate automatically on Vercel when the required TiDB and Backblaze values are present. Optional explicit settings are supported for non-Vercel environments: `MOVEMENT_DATABASE_PROVIDER=tidb`, `MOVEMENT_STORAGE_PROVIDER=b2`, `B2_S3_BUCKET`, `B2_S3_REGION`, and `B2_S3_ENDPOINT`.

### First-time deployment procedure

1. Create a TiDB database and apply the reviewed SQL migrations in [`drizzle/migrations`](./drizzle/migrations).
2. Create a private Backblaze B2 bucket and a bucket-scoped read/write application key. Configure the bucket’s S3-compatible CORS policy to allow `PUT` from the production Vercel origin and `https://*.vercel.app`; [`scripts/configure-b2-cors.mjs`](./scripts/configure-b2-cors.mjs) records the exact non-secret rule used by this project.
3. Add the four server-only environment variables above in Vercel. Environment variable changes require a fresh deployment before new functions can read them. [1]
4. Import the `DragAditya/movement` repository in Vercel or push the `main` branch to the linked project.
5. Exercise Studio uploads, a duplicate review decision, album creation, a `/media/*` image, and a Gemini suggestion after deployment.

> **Why direct-to-B2 uploads matter:** Vercel Functions accept a maximum request or response body of **4.5 MB**, while Movement supports image files up to 50 MB. The client therefore sends image bytes directly to the private B2 bucket through a short-lived signed URL and only sends compact metadata to Vercel for processing. [2]

### Migration utilities

The scripts in [`scripts`](./scripts) were designed for a controlled, one-way migration. They use credentials only from environment variables and never embed values in source code.

| Script | Purpose |
| --- | --- |
| `migrate-dragadi.mjs` | Applies the existing Drizzle migrations to TiDB. |
| `copy-movement-data-to-dragadi.mjs` | Copies Movement metadata without modifying the source database. |
| `copy-movement-media-to-b2.mjs` | Copies existing originals, thumbnails, and previews to Backblaze B2, then updates the target URLs to `/media/*`. |
| `copy-movement-mark-to-b2.mjs` | Copies the Movement mark to the private B2-backed asset used by `/brand/movement-mark`. |
| `configure-b2-cors.mjs` | Appends the direct-upload CORS rule while preserving existing S3 CORS rules. |
| `inspect-dragadi-ai-settings.mjs` | Prints only non-secret AI state for the TiDB target. |

## How duplicate review works

1. Each completed upload receives an exact content hash and a visual fingerprint.
2. A normal image enters the gallery and may receive an approval-only Gemini suggestion.
3. An exact or visual match becomes a **review candidate**, not a normal library image.
4. Studio displays a persistent Needs Review count. Refreshing the page does not lose candidates.
5. Exact matches can only keep the existing image. Visual matches can be kept out, uploaded as new, or used to replace the matching record.
6. **Apply to Similar** is limited to the same visual match target, while **Apply to All** only keeps existing images.

## Project layout

```text
api/                    Vercel serverless entry point
client/                 React pages, components, image loading, and Studio UI
server/                 Express, tRPC, database helpers, AI, storage, and upload pipeline
drizzle/                Database schema and SQL migrations
scripts/                Controlled migration and verification helpers
```

## Contribution checklist

Run the validation commands above and keep user images, `.env` files, secret values, generated production folders, and fake customer reviews out of the repository.

## References

[1] [Vercel Environment Variables](https://vercel.com/docs/environment-variables)

[2] [Vercel Functions Limits](https://vercel.com/docs/functions/limitations)

live At : [here](https://premgallery-inxewcag.manus.space/s/all-images?mode=immersive)
