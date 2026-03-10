import { z } from "zod";

import { normalizeAuthEmail } from "@/lib/auth-email";

const emailSchema = z.string().email();

export type AuthEmailReadinessUser = {
  id: string;
  email: string;
};

export type AuthEmailReadinessVerificationToken = {
  identifier: string;
  token: string;
};

export type AuthEmailReadinessStatus = "PASS" | "WARN" | "FAIL";

export type AuthEmailDuplicateGroup = {
  normalizedEmail: string;
  users: AuthEmailReadinessUser[];
};

export type AuthEmailNormalizationDrift = {
  currentValue: string;
  normalizedValue: string;
};

export type UserEmailNormalizationDrift = AuthEmailNormalizationDrift & {
  id: string;
};

export type VerificationIdentifierNormalizationDrift = AuthEmailNormalizationDrift & {
  token: string;
};

export type InvalidAuthEmailRecord = {
  currentValue: string;
  normalizedValue: string;
};

export type InvalidUserEmailRecord = InvalidAuthEmailRecord & {
  id: string;
};

export type InvalidVerificationIdentifierRecord = InvalidAuthEmailRecord & {
  token: string;
};

export type AuthEmailReadinessReport = {
  status: AuthEmailReadinessStatus;
  totalUsers: number;
  totalVerificationTokens: number;
  duplicateEmailGroups: AuthEmailDuplicateGroup[];
  userEmailNormalizationDrift: UserEmailNormalizationDrift[];
  verificationIdentifierNormalizationDrift: VerificationIdentifierNormalizationDrift[];
  invalidUserEmails: InvalidUserEmailRecord[];
  invalidVerificationIdentifiers: InvalidVerificationIdentifierRecord[];
};

function isValidNormalizedEmail(value: string) {
  return emailSchema.safeParse(value).success;
}

export function assessAuthEmailReadiness(input: {
  users: AuthEmailReadinessUser[];
  verificationTokens: AuthEmailReadinessVerificationToken[];
}): AuthEmailReadinessReport {
  const groupedUsers = new Map<string, AuthEmailReadinessUser[]>();
  const userEmailNormalizationDrift: UserEmailNormalizationDrift[] = [];
  const verificationIdentifierNormalizationDrift: VerificationIdentifierNormalizationDrift[] = [];
  const invalidUserEmails: InvalidUserEmailRecord[] = [];
  const invalidVerificationIdentifiers: InvalidVerificationIdentifierRecord[] = [];

  for (const user of input.users) {
    const normalizedEmail = normalizeAuthEmail(user.email);
    const nextGroup = groupedUsers.get(normalizedEmail) ?? [];
    nextGroup.push(user);
    groupedUsers.set(normalizedEmail, nextGroup);

    if (user.email !== normalizedEmail) {
      userEmailNormalizationDrift.push({
        id: user.id,
        currentValue: user.email,
        normalizedValue: normalizedEmail,
      });
    }

    if (!isValidNormalizedEmail(normalizedEmail)) {
      invalidUserEmails.push({
        id: user.id,
        currentValue: user.email,
        normalizedValue: normalizedEmail,
      });
    }
  }

  for (const verificationToken of input.verificationTokens) {
    const normalizedIdentifier = normalizeAuthEmail(verificationToken.identifier);

    if (verificationToken.identifier !== normalizedIdentifier) {
      verificationIdentifierNormalizationDrift.push({
        token: verificationToken.token,
        currentValue: verificationToken.identifier,
        normalizedValue: normalizedIdentifier,
      });
    }

    if (!isValidNormalizedEmail(normalizedIdentifier)) {
      invalidVerificationIdentifiers.push({
        token: verificationToken.token,
        currentValue: verificationToken.identifier,
        normalizedValue: normalizedIdentifier,
      });
    }
  }

  const duplicateEmailGroups = [...groupedUsers.entries()]
    .filter(([, users]) => users.length > 1)
    .map(([normalizedEmail, users]) => ({
      normalizedEmail,
      users: users.sort((a, b) => a.id.localeCompare(b.id)),
    }))
    .sort((a, b) => a.normalizedEmail.localeCompare(b.normalizedEmail));

  const status: AuthEmailReadinessStatus =
    duplicateEmailGroups.length > 0 || invalidUserEmails.length > 0
      ? "FAIL"
      : userEmailNormalizationDrift.length > 0 ||
          verificationIdentifierNormalizationDrift.length > 0 ||
          invalidVerificationIdentifiers.length > 0
        ? "WARN"
        : "PASS";

  return {
    status,
    totalUsers: input.users.length,
    totalVerificationTokens: input.verificationTokens.length,
    duplicateEmailGroups,
    userEmailNormalizationDrift,
    verificationIdentifierNormalizationDrift,
    invalidUserEmails,
    invalidVerificationIdentifiers,
  };
}
