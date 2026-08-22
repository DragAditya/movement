import { describe, expect, it } from "vitest";
import { unassignedImageIds } from "./album-membership";

describe("exclusive album library state", () => {
  it("keeps only images without a custom album in the unassigned Library", () => {
    expect(unassignedImageIds([1, 2, 3, 4], [{ albumId: 10, imageId: 2 }, { albumId: 12, imageId: 4 }])).toEqual([1, 3]);
  });
});
