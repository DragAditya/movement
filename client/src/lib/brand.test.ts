import { describe, expect, it } from "vitest";
import { brand } from "./brand";

describe("Movement brand configuration", () => {
  it("keeps the user-configured project title aligned with the Movement brand", () => {
    expect(import.meta.env.VITE_APP_TITLE).toBe(brand.name);
  });

  it("provides the approved product tagline and deployable mark asset", () => {
    expect(brand.tagline).toBe("Your moments, in motion.");
    expect(brand.markUrl).toBe("/brand/movement-mark");
  });
});
