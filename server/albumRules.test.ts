import { describe, expect, it } from "vitest";
import { buildExclusiveMembershipPlan, isMutableAlbum } from "./albumRules";

describe("album membership rules", () => {
  it("reassigns a requested image out of another custom album before adding it to its destination", () => {
    const plan = buildExclusiveMembershipPlan([
      { id: 1, albumId: 10, imageId: 7 },
      { id: 2, albumId: 22, imageId: 3 },
      { id: 3, albumId: 22, imageId: 9 },
    ], 22, [7, 9]);
    expect(plan.removeIds).toEqual([1, 2, 3]);
    expect(plan.nextMemberships).toEqual([
      { albumId: 22, imageId: 7, source: "manual", sortOrder: 0 },
      { albumId: 22, imageId: 9, source: "manual", sortOrder: 1 },
    ]);
  });

  it("keeps permanent system albums immutable while custom albums remain editable", () => {
    expect(isMutableAlbum("system")).toBe(false);
    expect(isMutableAlbum("custom")).toBe(true);
  });
});
