import { describe, expect, it, vi } from "vitest";
import { prepareAndUploadItemImage } from "./itemImage";

describe("prepareAndUploadItemImage", () => {
  it("uploads the prepared image and returns the NAS media URL", async () => {
    const upload = vi.fn().mockResolvedValue("/media/item-photo.png");
    const file = new File(["image"], "coat.png", { type: "image/png" });

    const imageUrl = await prepareAndUploadItemImage(file, upload);

    expect(upload).toHaveBeenCalledWith(expect.stringContaining("data:image/png;base64,"));
    expect(imageUrl).toBe("/media/item-photo.png");
  });

  it("keeps the prepared data URL when the API is offline", async () => {
    const upload = vi.fn().mockRejectedValue(new Error("offline"));
    const file = new File(["image"], "coat.png", { type: "image/png" });

    const imageUrl = await prepareAndUploadItemImage(file, upload);

    expect(imageUrl).toContain("data:image/png;base64,");
  });
});
