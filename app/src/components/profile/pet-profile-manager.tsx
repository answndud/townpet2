"use client";

import Link from "next/link";
import { useState, useTransition, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";

import {
  BREED_CATALOG_CUSTOM_VALUE,
  type BreedCatalogEntry,
} from "@/lib/breed-catalog";
import {
  PET_LIFE_STAGE_OPTIONS,
  PET_SIZE_CLASS_OPTIONS,
  getPetBreedDisplayLabel,
  getPetLifeStageLabel,
  getPetSizeClassLabel,
  hasBreedLoungeRoute,
  normalizePetBreedCode,
  type PetLifeStageValue,
  type PetSizeClassValue,
  type PetSpeciesValue,
} from "@/lib/pet-profile";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import {
  createPetAction,
  deletePetAction,
  updatePetAction,
} from "@/server/actions/pet";

type PetItem = {
  id: string;
  name: string;
  species: PetSpeciesValue;
  breedCode: string | null;
  breedLabel: string | null;
  sizeClass: PetSizeClassValue;
  lifeStage: PetLifeStageValue;
  weightKg: number | null;
  birthYear: number | null;
  imageUrl: string | null;
  bio: string | null;
  createdAt: Date;
};

type BreedCatalogBySpecies = Record<PetSpeciesValue, BreedCatalogEntry[]>;

type PetProfileManagerProps = {
  pets: PetItem[];
  breedCatalogBySpecies: BreedCatalogBySpecies;
};

type PetFormState = {
  name: string;
  species: PetSpeciesValue;
  breedCode: string;
  breedLabel: string;
  sizeClass: PetSizeClassValue;
  lifeStage: PetLifeStageValue;
  weightKg: string;
  birthYear: string;
  imageUrls: string[];
  bio: string;
};

const SPECIES_OPTIONS: Array<{ value: PetSpeciesValue; label: string }> = [
  { value: "DOG", label: "강아지" },
  { value: "CAT", label: "고양이" },
  { value: "BIRD", label: "조류" },
  { value: "REPTILE", label: "파충류" },
  { value: "SMALL_PET", label: "소동물" },
  { value: "AQUATIC", label: "어류/수조" },
  { value: "AMPHIBIAN", label: "양서류" },
  { value: "ARTHROPOD", label: "절지류/곤충" },
  { value: "SPECIAL_OTHER", label: "특수동물/기타" },
];

const SPECIES_LABEL = Object.fromEntries(
  SPECIES_OPTIONS.map((option) => [option.value, option.label]),
) as Record<PetSpeciesValue, string>;

const EMPTY_FORM: PetFormState = {
  name: "",
  species: "DOG",
  breedCode: "",
  breedLabel: "",
  sizeClass: "UNKNOWN",
  lifeStage: "UNKNOWN",
  weightKg: "",
  birthYear: "",
  imageUrls: [],
  bio: "",
};

function toFormState(pet: PetItem): PetFormState {
  return {
    name: pet.name,
    species: pet.species,
    breedCode: pet.breedCode ?? "",
    breedLabel: pet.breedLabel ?? "",
    sizeClass: pet.sizeClass,
    lifeStage: pet.lifeStage,
    weightKg: pet.weightKg === null ? "" : String(pet.weightKg),
    birthYear: pet.birthYear === null ? "" : String(pet.birthYear),
    imageUrls: pet.imageUrl ? [pet.imageUrl] : [],
    bio: pet.bio ?? "",
  };
}

function findBreedEntry(
  species: PetSpeciesValue,
  code: string | null | undefined,
  breedCatalogBySpecies: BreedCatalogBySpecies,
) {
  const normalizedCode = normalizePetBreedCode(code);
  if (!normalizedCode) {
    return null;
  }

  return (
    breedCatalogBySpecies[species]?.find((entry) => entry.code === normalizedCode) ?? null
  );
}

function getBreedSelectionValue(
  form: Pick<PetFormState, "species" | "breedCode" | "breedLabel">,
  breedCatalogBySpecies: BreedCatalogBySpecies,
) {
  const normalizedCode = normalizePetBreedCode(form.breedCode);
  if (normalizedCode === "UNKNOWN" || normalizedCode === "MIXED") {
    return normalizedCode;
  }
  if (normalizedCode && findBreedEntry(form.species, normalizedCode, breedCatalogBySpecies)) {
    return normalizedCode;
  }
  if (form.breedLabel.trim().length > 0 || normalizedCode) {
    return BREED_CATALOG_CUSTOM_VALUE;
  }
  return "";
}

function getCustomBreedLabelFallback(
  form: Pick<PetFormState, "breedCode" | "breedLabel">,
) {
  const manualLabel = form.breedLabel.trim();
  if (manualLabel.length > 0) {
    return manualLabel;
  }
  return normalizePetBreedCode(form.breedCode) ?? "";
}

function updateSpecies(
  species: PetSpeciesValue,
  setForm: Dispatch<SetStateAction<PetFormState>>,
) {
  setForm((prev) => ({
    ...prev,
    species,
    breedCode: "",
    breedLabel: "",
  }));
}

function updateBreedSelection(
  value: string,
  setForm: Dispatch<SetStateAction<PetFormState>>,
  breedCatalogBySpecies: BreedCatalogBySpecies,
) {
  setForm((prev) => {
    const currentSelection = getBreedSelectionValue(prev, breedCatalogBySpecies);

    if (value.length === 0) {
      return {
        ...prev,
        breedCode: "",
        breedLabel: "",
      };
    }

    if (value === BREED_CATALOG_CUSTOM_VALUE) {
      return {
        ...prev,
        breedCode: "",
        breedLabel:
          currentSelection === BREED_CATALOG_CUSTOM_VALUE ||
          currentSelection === "MIXED"
            ? getCustomBreedLabelFallback(prev)
            : "",
      };
    }

    if (value === "UNKNOWN") {
      return {
        ...prev,
        breedCode: "UNKNOWN",
        breedLabel: "",
      };
    }

    if (value === "MIXED") {
      return {
        ...prev,
        breedCode: "MIXED",
        breedLabel: currentSelection === "MIXED" ? prev.breedLabel : "",
      };
    }

    const matchedBreed = findBreedEntry(prev.species, value, breedCatalogBySpecies);
    if (!matchedBreed) {
      return {
        ...prev,
        breedCode: "",
        breedLabel: "",
      };
    }

    return {
      ...prev,
      breedCode: matchedBreed.code,
      breedLabel: matchedBreed.labelKo,
      sizeClass:
        prev.sizeClass === "UNKNOWN" && matchedBreed.defaultSize !== "UNKNOWN"
          ? matchedBreed.defaultSize
          : prev.sizeClass,
    };
  });
}

function getPetFormValidationMessage(
  form: PetFormState,
  breedCatalogBySpecies: BreedCatalogBySpecies,
) {
  if (form.name.trim().length === 0) {
    return "반려동물 이름을 입력해 주세요.";
  }

  if (
    getBreedSelectionValue(form, breedCatalogBySpecies) === BREED_CATALOG_CUSTOM_VALUE &&
    form.breedLabel.trim().length === 0
  ) {
    return "직접 입력할 품종/세부종 이름을 적어 주세요.";
  }

  return null;
}

type PetFormFieldsProps = {
  form: PetFormState;
  setForm: Dispatch<SetStateAction<PetFormState>>;
  breedCatalogBySpecies: BreedCatalogBySpecies;
  isPending: boolean;
  submitLabel: string;
  onSubmit: () => void;
  onCancel?: () => void;
};

function PetFormFields({
  form,
  setForm,
  breedCatalogBySpecies,
  isPending,
  submitLabel,
  onSubmit,
  onCancel,
}: PetFormFieldsProps) {
  const breedOptions = breedCatalogBySpecies[form.species] ?? [];
  const breedSelectionValue = getBreedSelectionValue(form, breedCatalogBySpecies);
  const selectedBreedEntry =
    breedSelectionValue.length > 0 &&
    breedSelectionValue !== "UNKNOWN" &&
    breedSelectionValue !== "MIXED" &&
    breedSelectionValue !== BREED_CATALOG_CUSTOM_VALUE
      ? findBreedEntry(form.species, breedSelectionValue, breedCatalogBySpecies)
      : null;
  const showCustomBreedInput =
    breedSelectionValue === BREED_CATALOG_CUSTOM_VALUE || breedSelectionValue === "MIXED";

  return (
    <div className="grid gap-2">
      <input
        className="tp-input-soft bg-white px-3 py-2 text-sm"
        value={form.name}
        onChange={(event) =>
          setForm((prev) => ({ ...prev, name: event.target.value }))
        }
        placeholder="이름"
      />
      <select
        className="tp-input-soft bg-white px-3 py-2 text-sm"
        value={form.species}
        onChange={(event) => updateSpecies(event.target.value as PetSpeciesValue, setForm)}
      >
        {SPECIES_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        className="tp-input-soft bg-white px-3 py-2 text-sm"
        value={breedSelectionValue}
        onChange={(event) =>
          updateBreedSelection(
            event.target.value,
            setForm,
            breedCatalogBySpecies,
          )
        }
      >
        <option value="">품종 선택 안 함</option>
        <option value="UNKNOWN">품종 미상</option>
        <option value="MIXED">혼종/믹스</option>
        <option value={BREED_CATALOG_CUSTOM_VALUE}>사전에 없어서 직접 입력</option>
        {breedOptions.length > 0 ? (
          <optgroup label={`${SPECIES_LABEL[form.species]} 주요 품종`}>
            {breedOptions.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.labelKo}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
      {selectedBreedEntry ? (
        <p className="rounded-lg border border-[#d7e4f5] bg-[#f7fbff] px-3 py-2 text-[11px] text-[#4f678d]">
          품종 사전 기준명: <span className="font-semibold text-[#1f3f71]">{selectedBreedEntry.labelKo}</span>
          {selectedBreedEntry.defaultSize !== "UNKNOWN"
            ? ` · 기본 체급 ${getPetSizeClassLabel(selectedBreedEntry.defaultSize, {
                includeUnknown: true,
              })}`
            : ""}
        </p>
      ) : null}
      {breedSelectionValue === "UNKNOWN" ? (
        <p className="rounded-lg border border-[#d7e4f5] bg-[#f7fbff] px-3 py-2 text-[11px] text-[#4f678d]">
          품종을 잘 모르면 그대로 저장해도 됩니다. 나중에 다시 수정할 수 있습니다.
        </p>
      ) : null}
      {breedSelectionValue === BREED_CATALOG_CUSTOM_VALUE ? (
        <p className="rounded-lg border border-[#d7e4f5] bg-[#f7fbff] px-3 py-2 text-[11px] text-[#4f678d]">
          사전에 없는 품종/세부종은 직접 입력해 저장할 수 있습니다.
        </p>
      ) : null}
      {showCustomBreedInput ? (
        <input
          className="tp-input-soft bg-white px-3 py-2 text-sm"
          value={form.breedLabel}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, breedLabel: event.target.value }))
          }
          placeholder={
            breedSelectionValue === "MIXED"
              ? "혼종 설명(선택, 예: 말티푸)"
              : "품종/세부종 직접 입력"
          }
        />
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          className="tp-input-soft bg-white px-3 py-2 text-sm"
          value={form.sizeClass}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              sizeClass: event.target.value as PetSizeClassValue,
            }))
          }
        >
          {PET_SIZE_CLASS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className="tp-input-soft bg-white px-3 py-2 text-sm"
          value={form.lifeStage}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              lifeStage: event.target.value as PetLifeStageValue,
            }))
          }
        >
          {PET_LIFE_STAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <input
        className="tp-input-soft bg-white px-3 py-2 text-sm"
        value={form.weightKg}
        onChange={(event) =>
          setForm((prev) => ({ ...prev, weightKg: event.target.value }))
        }
        placeholder="몸무게(kg, 선택)"
        inputMode="decimal"
      />
      <input
        className="tp-input-soft bg-white px-3 py-2 text-sm"
        value={form.birthYear}
        onChange={(event) =>
          setForm((prev) => ({ ...prev, birthYear: event.target.value }))
        }
        placeholder="태어난 연도(선택)"
        inputMode="numeric"
      />
      <ImageUploadField
        value={form.imageUrls}
        onChange={(urls) =>
          setForm((prev) => ({ ...prev, imageUrls: urls.slice(0, 1) }))
        }
        maxFiles={1}
        label="반려동물 사진 (5MB 이하)"
      />
      <textarea
        className="tp-input-soft min-h-[90px] bg-white px-3 py-2 text-sm"
        value={form.bio}
        onChange={(event) =>
          setForm((prev) => ({ ...prev, bio: event.target.value }))
        }
        placeholder="소개(선택)"
        maxLength={240}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isPending}
          className="tp-btn-primary inline-flex h-9 items-center justify-center self-start px-4 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "저장 중..." : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="tp-btn-soft inline-flex h-9 items-center justify-center px-4 text-xs font-semibold"
          >
            취소
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function PetProfileManager({
  pets,
  breedCatalogBySpecies,
}: PetProfileManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<PetFormState>(EMPTY_FORM);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PetFormState>(EMPTY_FORM);

  const saveCreate = () => {
    startTransition(async () => {
      setMessage(null);
      const validationMessage = getPetFormValidationMessage(
        createForm,
        breedCatalogBySpecies,
      );
      if (validationMessage) {
        setMessage(validationMessage);
        return;
      }

      const result = await createPetAction({
        name: createForm.name,
        species: createForm.species,
        breedCode: createForm.breedCode,
        breedLabel: createForm.breedLabel,
        sizeClass: createForm.sizeClass,
        lifeStage: createForm.lifeStage,
        weightKg: createForm.weightKg.length > 0 ? Number(createForm.weightKg) : undefined,
        birthYear: createForm.birthYear.length > 0 ? Number(createForm.birthYear) : undefined,
        imageUrl: createForm.imageUrls[0] ?? "",
        bio: createForm.bio,
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setCreateForm(EMPTY_FORM);
      setMessage("반려동물을 등록했습니다.");
      router.refresh();
    });
  };

  const saveUpdate = () => {
    if (!editTargetId) {
      return;
    }

    startTransition(async () => {
      setMessage(null);
      const validationMessage = getPetFormValidationMessage(
        editForm,
        breedCatalogBySpecies,
      );
      if (validationMessage) {
        setMessage(validationMessage);
        return;
      }

      const result = await updatePetAction({
        petId: editTargetId,
        name: editForm.name,
        species: editForm.species,
        breedCode: editForm.breedCode,
        breedLabel: editForm.breedLabel,
        sizeClass: editForm.sizeClass,
        lifeStage: editForm.lifeStage,
        weightKg: editForm.weightKg.length > 0 ? Number(editForm.weightKg) : undefined,
        birthYear: editForm.birthYear.length > 0 ? Number(editForm.birthYear) : undefined,
        imageUrl: editForm.imageUrls[0] ?? "",
        bio: editForm.bio,
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setEditTargetId(null);
      setEditForm(EMPTY_FORM);
      setMessage("반려동물 정보를 수정했습니다.");
      router.refresh();
    });
  };

  const removePet = (petId: string) => {
    if (!window.confirm("반려동물 정보를 삭제할까요?")) {
      return;
    }
    startTransition(async () => {
      setMessage(null);
      const result = await deletePetAction({ petId });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      if (editTargetId === petId) {
        setEditTargetId(null);
      }
      setMessage("반려동물 정보를 삭제했습니다.");
      router.refresh();
    });
  };

  return (
    <section className="tp-card p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-[#153a6a]">반려동물 프로필</h2>
      <p className="mt-2 text-xs text-[#5a7398]">
        이름, 종류, 품종, 체급, 생애단계, 몸무게, 태어난 연도와 사진(5MB 이하)을 등록할 수 있습니다.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="tp-soft-card p-4">
          <h3 className="text-sm font-semibold text-[#1f3f71]">새 반려동물 등록</h3>
          <div className="mt-3">
            <PetFormFields
              form={createForm}
              setForm={setCreateForm}
              breedCatalogBySpecies={breedCatalogBySpecies}
              isPending={isPending}
              submitLabel="등록"
              onSubmit={saveCreate}
            />
          </div>
        </div>

        <div className="tp-soft-card p-4">
          <h3 className="text-sm font-semibold text-[#1f3f71]">등록된 반려동물 ({pets.length})</h3>
          {pets.length === 0 ? (
            <p className="mt-3 text-xs text-[#5a7398]">등록된 반려동물이 없습니다.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {pets.map((pet) => {
                const isEditing = editTargetId === pet.id;
                const form = isEditing ? editForm : toFormState(pet);
                const breedDisplay = getPetBreedDisplayLabel({
                  breedCode: pet.breedCode,
                  breedLabel: pet.breedLabel,
                });
                const sizeLabel = getPetSizeClassLabel(pet.sizeClass);
                const lifeStageLabel = getPetLifeStageLabel(pet.lifeStage);
                const hasBreedLounge = hasBreedLoungeRoute(pet.breedCode);

                return (
                  <div key={pet.id} className="rounded-lg border border-[#c9d8ef] bg-white p-3 text-xs">
                    {isEditing ? (
                      <PetFormFields
                        form={form}
                        setForm={setEditForm}
                        breedCatalogBySpecies={breedCatalogBySpecies}
                        isPending={isPending}
                        submitLabel="저장"
                        onSubmit={saveUpdate}
                        onCancel={() => setEditTargetId(null)}
                      />
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-[#1f3f71]">{pet.name}</p>
                        <p className="mt-0.5 text-[#4f678d]">
                          {SPECIES_LABEL[pet.species]}
                          {breedDisplay ? ` · ${breedDisplay}` : ""}
                          {sizeLabel ? ` · ${sizeLabel}` : ""}
                          {lifeStageLabel ? ` · ${lifeStageLabel}` : ""}
                          {pet.weightKg !== null ? ` · ${pet.weightKg}kg` : ""}
                          {pet.birthYear !== null ? ` · ${pet.birthYear}년생` : ""}
                        </p>
                        <p className="mt-1 text-[#5a7398]">
                          {pet.bio?.trim() ? pet.bio : "소개 없음"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {hasBreedLounge ? (
                            <Link
                              href={`/lounges/breeds/${pet.breedCode}`}
                              className="tp-btn-soft inline-flex h-8 items-center justify-center px-3 text-[11px] font-semibold text-[#204f8a]"
                            >
                              품종 라운지
                            </Link>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              setEditTargetId(pet.id);
                              setEditForm(toFormState(pet));
                            }}
                            className="tp-btn-soft inline-flex h-8 items-center justify-center px-3 text-[11px] font-semibold"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => removePet(pet.id)}
                            className="tp-btn-soft inline-flex h-8 items-center justify-center px-3 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {message ? <p className="mt-3 text-xs text-[#4f678d]">{message}</p> : null}
    </section>
  );
}
