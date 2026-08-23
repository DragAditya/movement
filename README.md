# Movement

> A premium, image-first gallery for uploading, organizing, reviewing, and presenting image collections.

**Movement** is a React, TypeScript, Express, and MySQL gallery application designed around real uploaded images rather than placeholders. It includes a premium public gallery, a Studio workspace for managing albums, responsive image delivery, immersive slideshows, approval-only Gemini suggestions, and a durable duplicate-review queue.

**Live project:** [premgallery-inxewcag.manus.space](https://premgallery-inxewcag.manus.space)

## What it does

| Area | Included behavior |
| --- | --- |
| **Gallery and albums** | Shows real uploaded images, permanent All Images view, custom albums, one custom album per image, covers, descriptions, ordering, visibility, and permanent deletion. |
| **Studio uploads** | Supports drag-and-drop uploads, progress, cancellation, retry, compact previews, safe reconciliation, and responsive mobile controls. |
| **Duplicate protection** | Uses exact SHA-256 and visual fingerprints. Exact and visually similar uploads are stored in a durable **Needs Review** queue instead of being silently lost. |
| **Review workflow** | Compares new and existing images side by side. Users can keep the old image, upload a visual match as new, or replace an existing image while retaining its album placement. |
| **Gemini suggestions** | Produces editable short jewellery names, descriptions, and one album idea. No album is created or changed until the user approves it. |
| **Presentation** | Includes responsive public galleries and standard, immersive, and kiosk slideshow modes with full-image containment. |

## Technology

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, Radix UI, Wouter
- **Backend:** Express 4 and tRPC 11
- **Database:** MySQL / TiDB through Drizzle ORM
- **Media:** S3-compatible object storage with generated thumbnail and preview derivatives
- **AI:** Server-side Gemini integration; personal keys are never sent to the browser

## Run locally

### 1. Requirements

Install a recent version of **Node.js** (Node 22 is used for this project), [pnpm](https://pnpm.io/installation), and a MySQL-compatible database. You will also need a compatible S3 storage provider and OAuth configuration if you are running the full application outside Manus.

### 2. Install packages

```bash
pnpm install
```

### 3. Add environment variables

Create a local `.env` file. Do **not** commit it. The full application needs these values from your own services:

```bash
DATABASE_URL=
JWT_SECRET=
OAUTH_SERVER_URL=
VITE_APP_ID=
VITE_OAUTH_PORTAL_URL=
OWNER_OPEN_ID=
OWNER_NAME=
GEMINI_API_KEY=
```

> The deployed Manus project also receives platform-managed storage and Forge variables. Those values are not part of this public repository and cannot be copied to another host. If you deploy elsewhere, replace the Manus storage, OAuth, and Forge integrations with equivalents from your own providers.

### 4. Create the database tables

Review the SQL in `drizzle/`, then apply the migrations to your own database using your standard Drizzle workflow.

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### 5. Start the app

```bash
pnpm dev
```

Open the address printed in the terminal. The production build can be checked with:

```bash
pnpm test
pnpm check
pnpm build
```

## Project layout

```text
client/                 React pages, components, image loading, and Studio UI
server/                 Express, tRPC procedures, database helpers, AI, and upload logic
drizzle/                Database schema and SQL migrations
scripts/                Isolated QA helpers
```

## How duplicate review works

1. Each upload receives an exact content hash and a visual fingerprint.
2. A normal image enters the gallery and may receive an approval-only Gemini suggestion.
3. An exact or visual match stores its original, thumbnail, and preview as a **review candidate**, not as a normal gallery image.
4. Studio displays a persistent Needs Review count. Refreshing the page does not lose candidates.
5. Exact matches can only keep the existing image. Visual matches can be kept out, uploaded as new, or used to replace the matching record.
6. Safe bulk actions are available: **Apply to Similar** is limited to the same visual match target, and **Apply to All** only keeps existing images.

## Deploying with Manus

This project is already deployed through Manus, which supplies the existing OAuth, database, storage, and built-in service configuration. Use the live project link above for the current production version. Manus also supports custom domains from the project settings.

## Optional Vercel deployment

Vercel can deploy Vite and Express applications, but this repository currently relies on Manus-managed OAuth, storage proxy, and built-in platform variables. Therefore, a direct Vercel import is **not yet a drop-in production deployment**. Importing it without the replacements below can show the frontend but will not provide working uploads, authentication, database access, or AI services.

### Before connecting Vercel

1. **Choose replacements for Manus services.** Set up your own MySQL-compatible database, S3-compatible media storage, OAuth provider, and Gemini key.
2. **Port the service adapters.** Update the server storage and authentication integration so they use your chosen providers instead of Manus-specific helpers.
3. **Prepare an Express entry point for Vercel.** Vercel expects an Express app to be exported or otherwise exposed using its supported entry pattern. Review the official [Express on Vercel guide](https://vercel.com/docs/frameworks/backend/express).
4. **Keep secrets out of GitHub.** Add only variable names to `.env.example`; enter the real values in Vercel Project Settings.

### Vercel dashboard steps

1. Sign in to [Vercel](https://vercel.com) and choose **Add New → Project**.
2. Import the public GitHub repository named `movement`.
3. Let Vercel detect the project. The frontend build command is `pnpm build`.
4. In **Project Settings → Environment Variables**, add the values for your own database, OAuth, storage, and Gemini services. Add them for **Production**, **Preview**, and **Development** as needed.
5. Deploy the project. Vercel creates a preview deployment for non-production branches and uses the production branch, usually `main`, for production deployments.
6. Open the deployed site and test the full upload, album, review, and login flows before attaching a custom domain.

### Important Vercel notes

- Vercel documents that Vite single-page applications need a rewrite rule for deep links. Add a root `vercel.json` only after separating Vercel API routes from the frontend fallback; do not rewrite `/api/*` to `index.html`. See [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).
- Vercel environment-variable changes apply to new deployments, so redeploy after changing a value. See [Vercel environment variables](https://vercel.com/docs/environment-variables).
- Express runs as a serverless function on Vercel. Design uploads and storage for a serverless runtime rather than relying on local files. See [Express on Vercel](https://vercel.com/docs/frameworks/backend/express).

## Contribution checklist

Before opening a pull request, run:

```bash
pnpm test
pnpm check
pnpm build
```

Keep user images and secrets out of the repository. Do not add local uploads, `.env` files, generated production folders, or fake customer reviews.

## License

This repository is provided for the project owner. Add the license you want before accepting outside contributions.
