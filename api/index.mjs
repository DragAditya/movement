import { createMovementApp } from "../dist/apiApp.js";

// Vercel discovers this JavaScript function entry point. The build command
// creates dist/index.js first, and Vercel serves the Vite output separately.
export default createMovementApp();
