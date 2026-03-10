import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  runBuildVercel,
  shouldRunAuthEmailReadinessPreflight,
  shouldRunSecurityEnvPreflight,
} from "@/../scripts/vercel-build";

describe("vercel-build security preflight", () => {
  beforeEach(() => {
    delete process.env.DEPLOY_AUTH_EMAIL_PREFLIGHT_SKIP;
    delete process.env.DEPLOY_AUTH_EMAIL_PREFLIGHT_STRICT;
    delete process.env.DEPLOY_SECURITY_PREFLIGHT_SKIP;
    delete process.env.DEPLOY_SECURITY_PREFLIGHT_STRICT;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_TARGET_ENV;
  });

  it("enables strict preflight for production vercel targets", () => {
    expect(
      shouldRunSecurityEnvPreflight({
        NODE_ENV: "production",
        VERCEL_ENV: "production",
      }),
    ).toBe(true);
    expect(
      shouldRunSecurityEnvPreflight({
        NODE_ENV: "production",
        VERCEL_TARGET_ENV: "production",
      }),
    ).toBe(true);
  });

  it("skips strict preflight for preview unless explicitly forced", () => {
    expect(
      shouldRunSecurityEnvPreflight({
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
      }),
    ).toBe(false);
    expect(
      shouldRunSecurityEnvPreflight({
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        DEPLOY_SECURITY_PREFLIGHT_STRICT: "1",
      }),
    ).toBe(true);
  });

  it("enables auth email readiness preflight for production vercel targets", () => {
    expect(
      shouldRunAuthEmailReadinessPreflight({
        NODE_ENV: "production",
        VERCEL_ENV: "production",
      }),
    ).toBe(true);
    expect(
      shouldRunAuthEmailReadinessPreflight({
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
      }),
    ).toBe(false);
    expect(
      shouldRunAuthEmailReadinessPreflight({
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        DEPLOY_AUTH_EMAIL_PREFLIGHT_STRICT: "1",
      }),
    ).toBe(true);
  });

  it("stops the build before prisma deploy when security preflight fails", async () => {
    process.env.VERCEL_ENV = "production";

    const commandRunner = vi
      .fn()
      .mockResolvedValueOnce({ code: 1, output: "missing AUTH_SECRET" });

    await expect(runBuildVercel(commandRunner)).rejects.toThrow(
      "[build:vercel] security env preflight failed.",
    );

    expect(commandRunner).toHaveBeenCalledTimes(1);
    expect(commandRunner).toHaveBeenCalledWith("pnpm", ["ops:check:security-env:strict"]);
  });

  it("runs security preflight before deploy steps on production builds", async () => {
    process.env.VERCEL_ENV = "production";

    const commandRunner = vi.fn().mockResolvedValue({
      code: 0,
      output: "",
    });

    await runBuildVercel(commandRunner);

    expect(commandRunner.mock.calls).toEqual([
      ["pnpm", ["ops:check:security-env:strict"]],
      ["pnpm", ["ops:check:auth-email-readiness"]],
      ["pnpm", ["prisma", "migrate", "deploy"]],
      [
        "pnpm",
        [
          "prisma",
          "db",
          "execute",
          "--schema",
          "prisma/schema.prisma",
          "--file",
          "scripts/sql/community-board-repair.sql",
        ],
      ],
      [
        "pnpm",
        [
          "prisma",
          "db",
          "execute",
          "--schema",
          "prisma/schema.prisma",
          "--file",
          "scripts/sql/notification-archive-repair.sql",
        ],
      ],
      ["pnpm", ["prisma", "generate"]],
      ["pnpm", ["db:sync:neighborhoods"]],
      ["pnpm", ["next", "build"]],
    ]);
  });

  it("stops the build before prisma deploy when auth email preflight fails", async () => {
    process.env.VERCEL_ENV = "production";

    const commandRunner = vi
      .fn()
      .mockResolvedValueOnce({ code: 0, output: "security ok" })
      .mockResolvedValueOnce({ code: 1, output: "duplicate normalized email" });

    await expect(runBuildVercel(commandRunner)).rejects.toThrow(
      "[build:vercel] auth email readiness preflight failed.",
    );

    expect(commandRunner.mock.calls).toEqual([
      ["pnpm", ["ops:check:security-env:strict"]],
      ["pnpm", ["ops:check:auth-email-readiness"]],
    ]);
  });
});
