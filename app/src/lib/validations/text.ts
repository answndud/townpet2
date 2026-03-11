import { z } from "zod";

import { normalizeStoredText } from "@/lib/text-normalization";

type StringNormalizer = (value: string) => string | undefined;

function normalizeStringInput(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  return normalizeStoredText(value);
}

export function trimmedRequiredString(options: { min?: number; max?: number } = {}) {
  const { min = 1, max } = options;
  let schema = z.string().min(min);
  if (typeof max === "number") {
    schema = schema.max(max);
  }

  return z.preprocess(
    (value) => (typeof value === "string" ? normalizeStoredText(value).trim() : value),
    schema,
  ) as z.ZodType<string>;
}

export function optionalTrimmedString(options: { min?: number; max?: number } = {}) {
  return optionalNormalizedString(
    (value) => {
      const trimmed = normalizeStoredText(value).trim();
      return trimmed.length > 0 ? trimmed : undefined;
    },
    options,
  );
}

export function optionalNormalizedString(
  normalizer: StringNormalizer,
  options: { min?: number; max?: number } = {},
) {
  const { min = 1, max } = options;
  let schema = z.string().min(min);
  if (typeof max === "number") {
    schema = schema.max(max);
  }

  return z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      return normalizer(value);
    },
    schema.optional(),
  ) as z.ZodType<string | undefined>;
}

export function optionalTrimmedNonEmptyString(options: { min?: number; max?: number } = {}) {
  const { min = 1, max } = options;
  let schema = z.string().min(min);
  if (typeof max === "number") {
    schema = schema.max(max);
  }

  return z.preprocess(
    (value) => (typeof value === "string" ? normalizeStoredText(value).trim() : value),
    schema.optional(),
  ) as z.ZodType<string | undefined>;
}

export function normalizedString() {
  return z.preprocess(normalizeStringInput, z.string()) as z.ZodType<string>;
}
