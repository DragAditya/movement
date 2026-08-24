import { createMovementApp } from "../server/_core/index";

// Vercel discovers this default export as the serverless API entry point.
// Static Vite assets are served from dist/public by vercel.json rewrites.
export default createMovementApp();
