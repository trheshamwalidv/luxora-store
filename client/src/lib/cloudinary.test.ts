import { describe, expect, it } from "vitest";
import { getCloudinaryPublicConfig } from "./cloudinary";

describe("Cloudinary public upload configuration", () => {
  it("accepts only a complete public upload configuration", () => {
    expect(getCloudinaryPublicConfig({ VITE_CLOUDINARY_CLOUD_NAME: "dbt9psvo", VITE_CLOUDINARY_UPLOAD_PRESET: "luxora_assets" }))
      .toEqual({ cloudName: "dbt9psvo", uploadPreset: "luxora_assets" });
    expect(getCloudinaryPublicConfig({ VITE_CLOUDINARY_CLOUD_NAME: "dbt9psvo" })).toBeNull();
  });
});
