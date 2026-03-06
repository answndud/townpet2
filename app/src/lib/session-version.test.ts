import { describe, expect, it } from "vitest";

import {
  applyUserSessionStateToToken,
  syncSessionVersionToken,
} from "@/lib/session-version";

describe("session version token sync", () => {
  it("applies user session version to token", () => {
    const token = applyUserSessionStateToToken(
      {},
      { id: "user-1", nickname: "alex", sessionVersion: 3 },
    );

    expect(token).toMatchObject({
      id: "user-1",
      nickname: "alex",
      sessionVersion: 3,
    });
  });

  it("invalidates token when current version changed", () => {
    const token = syncSessionVersionToken(
      { id: "user-1", nickname: "alex", sessionVersion: 1 },
      { sessionVersion: 2, nickname: "alex" },
    );

    expect(token).toMatchObject({
      id: undefined,
      nickname: null,
      sessionVersion: 2,
      sessionInvalidated: true,
    });
  });

  it("keeps token valid when current version is unchanged", () => {
    const token: {
      id?: string;
      nickname?: string | null;
      sessionVersion?: number;
      sessionInvalidated?: boolean;
    } = syncSessionVersionToken(
      { id: "user-1", nickname: "alex", sessionVersion: 2 },
      { sessionVersion: 2, nickname: "alex-updated" },
    );

    expect(token).toMatchObject({
      id: "user-1",
      nickname: "alex-updated",
      sessionVersion: 2,
    });
    expect(token.sessionInvalidated).toBeUndefined();
  });

  it("invalidates legacy token when current version is already bumped", () => {
    const token = syncSessionVersionToken(
      { id: "user-1", nickname: "alex" },
      { sessionVersion: 1, nickname: "alex" },
    );

    expect(token).toMatchObject({
      id: undefined,
      nickname: null,
      sessionVersion: 1,
      sessionInvalidated: true,
    });
  });
});
