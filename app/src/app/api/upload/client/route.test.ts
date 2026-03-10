import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/upload/client/route";

describe("POST /api/upload/client contract", () => {
  it("returns DIRECT_UPLOAD_DISABLED", async () => {
    const response = await POST();
    const payload = await response.json();

    expect(response.status).toBe(410);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "DIRECT_UPLOAD_DISABLED" },
    });
  });
});
