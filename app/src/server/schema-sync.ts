import { Prisma } from "@prisma/client";

import { ServiceError } from "@/server/services/service-error";

type MissingSchemaMatchOptions = {
  columns?: string[];
  fallbackPatterns?: string[];
};

export function createSchemaSyncRequiredError(message: string) {
  return new ServiceError(message, "SCHEMA_SYNC_REQUIRED", 503);
}

export function isSchemaSyncRequiredError(error: unknown): error is ServiceError {
  return error instanceof ServiceError && error.code === "SCHEMA_SYNC_REQUIRED";
}

export function isMissingSchemaError(
  error: unknown,
  options: MissingSchemaMatchOptions = {},
) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  ) {
    if (error.code === "P2021") {
      return true;
    }

    if (!options.columns || options.columns.length === 0) {
      return true;
    }

    const column = typeof error.meta?.column === "string" ? error.meta.column : "";
    return options.columns.some((candidate) => column.includes(candidate));
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (options.fallbackPatterns ?? []).some((pattern) =>
    message.includes(pattern.toLowerCase()),
  );
}

export function assertSchemaDelegate<T>(
  delegate: T | null | undefined,
  message: string,
): T {
  if (!delegate) {
    throw createSchemaSyncRequiredError(message);
  }

  return delegate;
}

export function rethrowSchemaSyncRequired(
  error: unknown,
  message: string,
  options: MissingSchemaMatchOptions = {},
): never {
  if (isMissingSchemaError(error, options)) {
    throw createSchemaSyncRequiredError(message);
  }

  throw error;
}
