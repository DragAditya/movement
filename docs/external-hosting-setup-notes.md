# External Hosting Setup Notes

## Vercel

The public GitHub repository is `DragAditya/movement`. The linked Vercel Hobby project is named `movement` in the `Aditya's projects` team and appears at `https://movement-tawny-gamma.vercel.app`. It currently has no production deployment. The authenticated Vercel dashboard is available at `https://vercel.com/adityas-projects-5ee85a73/movement`.

Before the first production deployment, add these environment variables in the Vercel project settings for Production and Preview: `TIDB_DATABASE_URL`, `B2_S3_KEY_ID`, and `B2_S3_APPLICATION_KEY`. The application detects Vercel together with these variables and automatically uses TiDB and Backblaze B2 while Manus remains unchanged.

## TiDB Cloud

The active free TiDB Cloud Starter resource is `DragAdi`, in AWS Singapore (`ap-southeast-1`). Its dedicated `movement_gallery` database exists and all current Drizzle migrations have been applied. A TLS connection test and schema validation passed. Existing Movement metadata was copied from the Manus database with source data preserved.

## Backblaze B2

The active private, encrypted B2 bucket is `movement-media-waghaditya` at the S3 endpoint `https://s3.us-east-005.backblazeb2.com`. A restricted read/write key named `movement-vercel` is scoped only to this bucket. Credential validation passed. Existing originals, thumbnails, and previews were copied from Manus storage to this bucket, and DragAdi image records now reference `/media/...` delivery URLs.
