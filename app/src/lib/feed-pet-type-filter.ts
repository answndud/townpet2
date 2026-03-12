export function normalizeFeedPetTypeIds(
  petTypeIds: string[],
  allPetTypeIds: string[],
) {
  const allowedIds = new Set(allPetTypeIds);
  const normalized = Array.from(new Set(petTypeIds)).filter((petTypeId) =>
    allowedIds.size === 0 ? petTypeId.length > 0 : allowedIds.has(petTypeId),
  );

  if (allowedIds.size === 0) {
    return normalized;
  }

  if (
    normalized.length === allowedIds.size &&
    allPetTypeIds.every((petTypeId) => normalized.includes(petTypeId))
  ) {
    return [];
  }

  return normalized;
}
