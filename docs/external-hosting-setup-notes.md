# External Hosting Setup Notes

## Vercel

The public GitHub repository is `DragAditya/movement`. The linked Vercel Hobby project is named `movement` in the `Aditya's projects` team and appears at `https://movement-tawny-gamma.vercel.app`. The authenticated Vercel dashboard is available at `https://vercel.com/adityas-projects-5ee85a73/movement`.

Vercel now has `TIDB_DATABASE_URL`, `B2_S3_KEY_ID`, `B2_S3_APPLICATION_KEY`, and `GEMINI_API_KEY` in Production and Preview. The application detects Vercel together with the TiDB and Backblaze values and automatically uses TiDB and Backblaze B2 while Manus remains unchanged. The copied TiDB AI settings use the personal provider with automatic analysis enabled, preserving approval-only Gemini suggestions without relying on the Manus built-in provider.

## Deployment Validation Notes

The original TypeScript API entry deployed but failed during Vercel function initialization because Vercel separately type-checked the imported Express source graph. The repair uses a JavaScript `api/index.mjs` entry that imports a pure `dist/apiApp.js` bundle. The local Vite/bootstrap module is separately compiled only for Manus and local development, preventing Vite and Lightning CSS from entering the Vercel function graph. A local harness running the same `VERCEL=1` mode returned HTTP 200 from `gallery.publicDashboard`. The latest Git-linked production deployment is ready and awaiting final public-route validation.

## TiDB Cloud

The active free TiDB Cloud Starter resource is `DragAdi`, in AWS Singapore (`ap-southeast-1`). Its dedicated `movement_gallery` database exists and all current Drizzle migrations have been applied. A TLS connection test and schema validation passed. Existing Movement metadata was copied from the Manus database with source data preserved.

## Backblaze B2

The active private, encrypted B2 bucket is `movement-media-waghaditya` at the S3 endpoint `https://s3.us-east-005.backblazeb2.com`. A restricted read/write key named `movement-vercel` is scoped only to this bucket. Credential validation passed. Existing originals, thumbnails, and previews were copied from Manus storage to this bucket, and DragAdi image records now reference `/media/...` delivery URLs.
