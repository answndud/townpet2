import { serializeError } from "@/server/logger";
import { assertGuestSafetyControlPlaneReady } from "@/server/services/guest-safety.service";
import { assertSanctionControlPlaneReady } from "@/server/services/sanction.service";
import { assertNotificationControlPlaneReady } from "@/server/queries/notification.queries";
import { assertPolicyControlPlaneReady } from "@/server/queries/policy.queries";
import { assertUserRelationControlPlaneReady } from "@/server/queries/user-relation.queries";
import { isSchemaSyncRequiredError } from "@/server/schema-sync";

type ModerationControlPlaneCheckKey =
  | "sanction"
  | "policy"
  | "userRelation"
  | "notification"
  | "guestSafety";

type ModerationControlPlaneCheck = {
  key: ModerationControlPlaneCheckKey;
  state: "ok" | "error";
  message: string;
};

type ModerationControlPlaneHealth = {
  state: "ok" | "error";
  checks: ModerationControlPlaneCheck[];
};

async function probe(
  key: ModerationControlPlaneCheckKey,
  label: string,
  checker: () => Promise<void>,
): Promise<ModerationControlPlaneCheck> {
  try {
    await checker();
    return {
      key,
      state: "ok",
      message: `${label} ready`,
    };
  } catch (error) {
    if (isSchemaSyncRequiredError(error)) {
      return {
        key,
        state: "error",
        message: error.message,
      };
    }

    return {
      key,
      state: "error",
      message: `Unexpected control plane probe failure: ${JSON.stringify(serializeError(error))}`,
    };
  }
}

export async function checkModerationControlPlaneHealth(): Promise<ModerationControlPlaneHealth> {
  const checks = await Promise.all([
    probe("sanction", "sanction", assertSanctionControlPlaneReady),
    probe("policy", "policy", assertPolicyControlPlaneReady),
    probe("userRelation", "user relation", assertUserRelationControlPlaneReady),
    probe("notification", "notification", assertNotificationControlPlaneReady),
    probe("guestSafety", "guest safety", assertGuestSafetyControlPlaneReady),
  ]);

  return {
    state: checks.some((item) => item.state === "error") ? "error" : "ok",
    checks,
  };
}
