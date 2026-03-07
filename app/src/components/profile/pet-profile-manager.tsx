"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ImageUploadField } from "@/components/ui/image-upload-field";
import {
  PET_LIFE_STAGE_OPTIONS,
  PET_SIZE_CLASS_OPTIONS,
  getPetBreedDisplayLabel,
  getPetLifeStageLabel,
  getPetSizeClassLabel,
  hasBreedLoungeRoute,
  type PetLifeStageValue,
  type PetSizeClassValue,
  type PetSpeciesValue,
} from "@/lib/pet-profile";
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

type PetProfileManagerProps = {
  pets: PetItem[];
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

export function PetProfileManager({ pets }: PetProfileManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<PetFormState>(EMPTY_FORM);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PetFormState>(EMPTY_FORM);

  const saveCreate = () => {
    startTransition(async () => {
      setMessage(null);
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
        이름, 종류, 품종 코드/이름, 체급, 생애단계, 몸무게, 태어난 연도와 사진(5MB 이하)을 등록할 수 있습니다.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="tp-soft-card p-4">
          <h3 className="text-sm font-semibold text-[#1f3f71]">새 반려동물 등록</h3>
          <div className="mt-3 grid gap-2">
            <input
              className="tp-input-soft bg-white px-3 py-2 text-sm"
              value={createForm.name}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="이름"
            />
            <select
              className="tp-input-soft bg-white px-3 py-2 text-sm"
              value={createForm.species}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  species: event.target.value as PetSpeciesValue,
                }))
              }
            >
              {SPECIES_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              className="tp-input-soft bg-white px-3 py-2 text-sm"
              value={createForm.breedCode}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, breedCode: event.target.value }))
              }
              placeholder="품종 코드(예: MALTESE, KOREAN_SHORTHAIR, MIXED)"
            />
            <input
              className="tp-input-soft bg-white px-3 py-2 text-sm"
              value={createForm.breedLabel}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, breedLabel: event.target.value }))
              }
              placeholder="품종/세부종(선택)"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                className="tp-input-soft bg-white px-3 py-2 text-sm"
                value={createForm.sizeClass}
                onChange={(event) =>
                  setCreateForm((prev) => ({
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
                value={createForm.lifeStage}
                onChange={(event) =>
                  setCreateForm((prev) => ({
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
              value={createForm.weightKg}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, weightKg: event.target.value }))
              }
              placeholder="몸무게(kg, 선택)"
              inputMode="decimal"
            />
            <input
              className="tp-input-soft bg-white px-3 py-2 text-sm"
              value={createForm.birthYear}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, birthYear: event.target.value }))
              }
              placeholder="태어난 연도(선택)"
              inputMode="numeric"
            />
            <ImageUploadField
              value={createForm.imageUrls}
              onChange={(urls) =>
                setCreateForm((prev) => ({ ...prev, imageUrls: urls.slice(0, 1) }))
              }
              maxFiles={1}
              label="반려동물 사진 (5MB 이하)"
            />
            <textarea
              className="tp-input-soft min-h-[90px] bg-white px-3 py-2 text-sm"
              value={createForm.bio}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, bio: event.target.value }))
              }
              placeholder="소개(선택)"
              maxLength={240}
            />
            <button
              type="button"
              onClick={saveCreate}
              disabled={isPending}
              className="tp-btn-primary inline-flex h-9 items-center justify-center self-start px-4 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "저장 중..." : "등록"}
            </button>
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
                      <div className="grid gap-2">
                        <input
                          className="tp-input-soft px-2 py-1.5 text-sm"
                          value={form.name}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, name: event.target.value }))
                          }
                          placeholder="이름"
                        />
                        <select
                          className="tp-input-soft px-2 py-1.5 text-sm"
                          value={form.species}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              species: event.target.value as PetSpeciesValue,
                            }))
                          }
                        >
                          {SPECIES_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <input
                          className="tp-input-soft px-2 py-1.5 text-sm"
                          value={form.breedCode}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, breedCode: event.target.value }))
                          }
                          placeholder="품종 코드(예: MALTESE)"
                        />
                        <input
                          className="tp-input-soft px-2 py-1.5 text-sm"
                          value={form.breedLabel}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, breedLabel: event.target.value }))
                          }
                          placeholder="품종/세부종(선택)"
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <select
                            className="tp-input-soft px-2 py-1.5 text-sm"
                            value={form.sizeClass}
                            onChange={(event) =>
                              setEditForm((prev) => ({
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
                            className="tp-input-soft px-2 py-1.5 text-sm"
                            value={form.lifeStage}
                            onChange={(event) =>
                              setEditForm((prev) => ({
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
                          className="tp-input-soft px-2 py-1.5 text-sm"
                          value={form.weightKg}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, weightKg: event.target.value }))
                          }
                          placeholder="몸무게(kg, 선택)"
                          inputMode="decimal"
                        />
                        <input
                          className="tp-input-soft px-2 py-1.5 text-sm"
                          value={form.birthYear}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, birthYear: event.target.value }))
                          }
                          placeholder="태어난 연도(선택)"
                          inputMode="numeric"
                        />
                        <ImageUploadField
                          value={form.imageUrls}
                          onChange={(urls) =>
                            setEditForm((prev) => ({ ...prev, imageUrls: urls.slice(0, 1) }))
                          }
                          maxFiles={1}
                          label="반려동물 사진 (5MB 이하)"
                        />
                        <textarea
                          className="tp-input-soft min-h-[80px] px-2 py-1.5 text-sm"
                          value={form.bio}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, bio: event.target.value }))
                          }
                          maxLength={240}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={saveUpdate}
                            disabled={isPending}
                            className="tp-btn-primary inline-flex h-8 items-center justify-center px-3 text-[11px] font-semibold"
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditTargetId(null)}
                            className="tp-btn-soft inline-flex h-8 items-center justify-center px-3 text-[11px] font-semibold"
                          >
                            취소
                          </button>
                        </div>
                      </div>
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
