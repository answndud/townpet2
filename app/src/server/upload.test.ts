import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

import { saveUploadedImage } from "@/server/upload";
import { registerUploadAsset } from "@/server/upload-asset.service";
import { ServiceError } from "@/server/services/service-error";
import { mkdir, unlink, writeFile } from "fs/promises";

vi.mock("@/lib/env", () => ({
  runtimeEnv: {
    isProduction: false,
    blobReadWriteToken: null,
  },
}));

vi.mock("@/server/upload-asset.service", () => ({
  registerUploadAsset: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({
  del: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  mkdir: vi.fn(),
  unlink: vi.fn(),
  writeFile: vi.fn(),
}));

const mockRegisterUploadAsset = vi.mocked(registerUploadAsset);
const mockMkdir = vi.mocked(mkdir);
const mockWriteFile = vi.mocked(writeFile);
const mockUnlink = vi.mocked(unlink);

async function createPngFile() {
  const pngBytes = await sharp({
    create: {
      width: 8,
      height: 8,
      channels: 4,
      background: { r: 255, g: 180, b: 60, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  return new File([Uint8Array.from(pngBytes)], "pet.png", { type: "image/png" });
}

describe("saveUploadedImage", () => {
  beforeEach(() => {
    mockRegisterUploadAsset.mockReset();
    mockMkdir.mockReset();
    mockWriteFile.mockReset();
    mockUnlink.mockReset();

    mockRegisterUploadAsset.mockResolvedValue({
      id: "asset-1",
      url: "/uploads/pet.png",
      status: "TEMPORARY",
    } as never);
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);
  });

  it("rejects signature mismatch for declared png files", async () => {
    const invalidFile = new File([new Uint8Array([0xff, 0xd8, 0xff])], "bad.png", {
      type: "image/png",
    });

    await expect(saveUploadedImage(invalidFile)).rejects.toMatchObject({
      code: "IMAGE_SIGNATURE_MISMATCH",
      status: 400,
    } satisfies Partial<ServiceError>);
  });

  it("writes locally and registers upload asset metadata", async () => {
    const file = await createPngFile();
    const result = await saveUploadedImage(file, {
      ownerUserId: "user-1",
    });

    expect(result).toMatchObject({
      mimeType: "image/webp",
      size: expect.any(Number),
      thumbnailUrl: expect.stringMatching(/^\/media\/uploads\//),
      url: expect.stringMatching(/^\/media\/uploads\//),
    });
    expect(mockMkdir).toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalledTimes(2);
    expect(mockRegisterUploadAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringMatching(/^\/uploads\//),
        thumbnailUrl: expect.stringMatching(/^\/uploads\//),
        width: expect.any(Number),
        height: expect.any(Number),
        mimeType: "image/webp",
        ownerUserId: "user-1",
      }),
    );
  });
});
