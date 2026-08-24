# External Hosting Setup Notes

## Vercel

The public GitHub repository is `DragAditya/movement`. The linked Vercel Hobby project is named `movement` in the `Aditya's projects` team and appears at `https://movement-tawny-gamma.vercel.app`. The authenticated Vercel dashboard is available at `https://vercel.com/adityas-projects-5ee85a73/movement`.

Vercel now has `TIDB_DATABASE_URL`, `B2_S3_KEY_ID`, `B2_S3_APPLICATION_KEY`, and `GEMINI_API_KEY` in Production and Preview. The application detects Vercel together with the TiDB and Backblaze values and automatically uses TiDB and Backblaze B2 while Manus remains unchanged. The copied TiDB AI settings use the personal provider with automatic analysis enabled, preserving approval-only Gemini suggestions without relying on the Manus built-in provider.

## Deployment Validation Notes

The original TypeScript API entry deployed but failed during Vercel function initialization because Vercel separately type-checked the imported Express source graph. An intermediate JavaScript wrapper still bundled local Vite dependencies and caused a missing `lightningcss.linux-x64-gnu.node` runtime error. The current repair uses a JavaScript `api/index.mjs` entry that imports a pure `dist/apiApp.js` bundle. The local Vite/bootstrap module is separately compiled only for Manus and local development, preventing Vite and Lightning CSS from entering the Vercel function graph. A local harness running the same `VERCEL=1` mode returned HTTP 200 from `gallery.publicDashboard`.

The latest Git-linked production deployment (`dpl_5U6334cm7PeAi8xrbppe8qwPQxvC`) returned HTTP 200 from `gallery.publicDashboard` in Vercel and visibly rendered the copied public gallery: 17 images, four custom albums, thumbnail/previews delivered through `/media/*`, and the Movement mark delivered through `/brand/movement-mark`.

The public `/manage` Studio route also loaded without an authentication prompt, showing the copied All Images count of 17, the persisted album workspace, the empty unorganised queue, and the empty durable duplicate-review queue. This preserves the requested no-login Studio behavior.

The live `/api/upload/presign` route issued a direct-to-B2 request in Vercel with HTTP 201. A four-byte JPEG test uploaded from the Vercel browser origin to its signed Backblaze URL with HTTP 200, confirming the configured CORS rule. The isolated object was removed immediately afterwards; no gallery metadata or user media was changed during this verification.

The public `/albums` route and a real deep-linked custom album route (`/albums/bangles-mt60lwvs`) both rendered correctly through Vercel’s SPA rewrite. The album detail displayed all five copied Bangle previews from the private Backblaze-backed `/media/*` route.

The deployed `gallery.getAiProviderStatus` procedure returned HTTP 200 and only the safe `personalKeyConfigured: true` flag. Combined with the TiDB AI settings inspection, this confirms that automatic, approval-only personal Gemini suggestions remain enabled without exposing a key. Vercel’s grouped runtime-error check returned no current production error clusters after the final public-route validation.

## TiDB Cloud

The active free TiDB Cloud Starter resource is `DragAdi`, in AWS Singapore (`ap-southeast-1`). Its dedicated `movement_gallery` database exists and all current Drizzle migrations have been applied. A TLS connection test and schema validation passed. Existing Movement metadata was copied from the Manus database with source data preserved.

## Backblaze B2

The active private, encrypted B2 bucket is `movement-media-waghaditya` at the S3 endpoint `https://s3.us-east-005.backblazeb2.com`. A restricted read/write key named `movement-vercel` is scoped only to this bucket. Credential validation passed. Existing originals, thumbnails, and previews were copied from Manus storage to this bucket, and DragAdi image records now reference `/media/...` delivery URLs.
