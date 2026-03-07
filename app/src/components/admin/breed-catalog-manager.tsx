"use client";

import { useMemo, useState, useTransition } from "react";

import type {
  EffectiveBreedCatalogEntry,
  PersistedBreedCatalogEntry,
} from "@/lib/breed-catalog";
import {
  PET_SIZE_CLASS_OPTIONS,
  PET_SPECIES_VALUES,
  getPetSizeClassLabel,
  getPetSpeciesLabel,
  type PetSizeClassValue,
  type PetSpeciesValue,
} from "@/lib/pet-profile";
import {
  deleteBreedCatalogEntryAction,
  upsertBreedCatalogEntryAction,
} from "@/server/actions/breed-catalog";

type BreedCatalogAdminEntry = PersistedBreedCatalogEntry & {
  source: "override" | "custom";
};

type BreedCatalogManagerProps = {
  effectiveCatalogBySpecies: Record<PetSpeciesValue, EffectiveBreedCatalogEntry[]>;
  adminEntries: BreedCatalogAdminEntry[];
};

type FormState = {
  id: string | null;
  species: PetSpeciesValue;
  code: string;
  labelKo: string;
  aliasesText: string;
  defaultSize: PetSizeClassValue;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  id: null,
  species: "DOG",
  code: "",
  labelKo: "",
  aliasesText: "",
  defaultSize: "UNKNOWN",
  isActive: true,
};

export function BreedCatalogManager({
  effectiveCatalogBySpecies,
  adminEntries,
}: BreedCatalogManagerProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groupedAdminEntries = useMemo(() => {
    return PET_SPECIES_VALUES.reduce(
      (acc, species) => ({
        ...acc,
        [species]: adminEntries.filter((entry) => entry.species === species),
      }),
      {} as Record<PetSpeciesValue, BreedCatalogAdminEntry[]>,
    );
  }, [adminEntries]);

  const handleSubmit = () => {
    startTransition(async () => {
      setMessage(null);
      setError(null);

      const aliases = form.aliasesText
        .split(/[\n,]/)
        .map((alias) => alias.trim())
        .filter((alias) => alias.length > 0);

      const result = await upsertBreedCatalogEntryAction({
        species: form.species,
        code: form.code,
        labelKo: form.labelKo,
        aliases,
        defaultSize: form.defaultSize,
        isActive: form.isActive,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setMessage(
        form.id
          ? "품종 사전 entry를 수정했습니다."
          : "품종 사전 entry를 저장했습니다.",
      );
      setForm(EMPTY_FORM);
    });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("이 DB entry를 삭제할까요? 기본 사전 항목이라면 fallback 기본값으로 복원됩니다.")) {
      return;
    }

    startTransition(async () => {
      setMessage(null);
      setError(null);

      const result = await deleteBreedCatalogEntryAction({ id });
      if (!result.ok) {
        setError(result.message);
        return;
      }

      setMessage("품종 사전 entry를 삭제했습니다.");
      setForm((prev) => (prev.id === id ? EMPTY_FORM : prev));
    });
  };

  const handleEditPersisted = (entry: BreedCatalogAdminEntry) => {
    setForm({
      id: entry.id,
      species: entry.species,
      code: entry.code,
      labelKo: entry.labelKo,
      aliasesText: entry.aliases.join(", "),
      defaultSize: entry.defaultSize,
      isActive: entry.isActive,
    });
    setMessage(null);
    setError(null);
  };

  const handleEditEffective = (entry: EffectiveBreedCatalogEntry) => {
    setForm({
      id: entry.persistedId,
      species: entry.species,
      code: entry.code,
      labelKo: entry.labelKo,
      aliasesText: entry.aliases.join(", "),
      defaultSize: entry.defaultSize,
      isActive: true,
    });
    setMessage(null);
    setError(null);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="tp-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-[#153a6a]">유효 품종 사전</h2>
        <p className="mt-2 text-xs text-[#5a7398]">
          실제 사용자 폼에 노출되는 품종 목록입니다. 기본 사전, override, custom 항목이 merge된 결과를 보여줍니다.
        </p>
        <div className="mt-4 grid gap-4">
          {PET_SPECIES_VALUES.map((species) => {
            const entries = effectiveCatalogBySpecies[species] ?? [];
            return (
              <article
                key={species}
                className="rounded-xl border border-[#d9e5f4] bg-[#fbfdff] p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#1f3f71]">
                      {getPetSpeciesLabel(species)}
                    </h3>
                    <p className="text-[11px] text-[#5a7398]">{entries.length}개 노출 중</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {entries.map((entry) => (
                    <button
                      key={`${species}:${entry.code}`}
                      type="button"
                      onClick={() => handleEditEffective(entry)}
                      className="rounded-lg border border-[#cadbf3] bg-white px-3 py-2 text-left text-[11px] text-[#355988] transition hover:bg-[#f5f9ff]"
                    >
                      <div className="font-semibold text-[#1f3f71]">{entry.labelKo}</div>
                      <div className="mt-0.5">
                        {entry.code} · {getPetSizeClassLabel(entry.defaultSize, { includeUnknown: true })}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#5a7398]">
                        {entry.source === "default"
                          ? "DEFAULT"
                          : entry.source === "override"
                            ? "OVERRIDE"
                            : "CUSTOM"}
                      </div>
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5">
        <section className="tp-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-[#153a6a]">DB override/custom 편집</h2>
              <p className="mt-2 text-xs text-[#5a7398]">
                기본 사전과 같은 code로 저장하면 override, 새로운 code면 custom entry가 됩니다.
              </p>
            </div>
            {form.id ? (
              <button
                type="button"
                onClick={() => setForm(EMPTY_FORM)}
                className="tp-btn-soft px-3 py-1.5 text-xs"
              >
                새로 입력
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3">
            <label className="flex flex-col gap-1 text-xs text-[#355988]">
              <span className="font-semibold">종류</span>
              <select
                className="tp-input-soft bg-white px-3 py-2 text-sm"
                value={form.species}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    species: event.target.value as PetSpeciesValue,
                  }))
                }
                disabled={isPending}
              >
                {PET_SPECIES_VALUES.map((species) => (
                  <option key={species} value={species}>
                    {getPetSpeciesLabel(species)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#355988]">
              <span className="font-semibold">품종 코드</span>
              <input
                className="tp-input-soft bg-white px-3 py-2 text-sm"
                value={form.code}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
                }
                placeholder="예: MALTESE, KOREAN_SHORTHAIR"
                disabled={isPending}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#355988]">
              <span className="font-semibold">표시명</span>
              <input
                className="tp-input-soft bg-white px-3 py-2 text-sm"
                value={form.labelKo}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, labelKo: event.target.value }))
                }
                placeholder="예: 말티즈"
                disabled={isPending}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#355988]">
              <span className="font-semibold">별칭</span>
              <textarea
                className="tp-input-soft min-h-[88px] bg-white px-3 py-2 text-sm"
                value={form.aliasesText}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, aliasesText: event.target.value }))
                }
                placeholder="쉼표 또는 줄바꿈으로 구분"
                disabled={isPending}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#355988]">
              <span className="font-semibold">기본 체급</span>
              <select
                className="tp-input-soft bg-white px-3 py-2 text-sm"
                value={form.defaultSize}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    defaultSize: event.target.value as PetSizeClassValue,
                  }))
                }
                disabled={isPending}
              >
                {PET_SIZE_CLASS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-[#cadbf3] bg-white px-3 py-2 text-xs text-[#355988]">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                }
                disabled={isPending}
                className="accent-[#3567b5]"
              />
              <span className="font-semibold">활성 상태로 저장</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="tp-btn-primary px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? "저장 중..." : form.id ? "수정 저장" : "entry 저장"}
              </button>
              {form.id ? (
                <button
                  type="button"
                  onClick={() => setForm(EMPTY_FORM)}
                  className="tp-btn-soft px-4 py-2 text-xs"
                >
                  취소
                </button>
              ) : null}
            </div>
            {message ? <p className="text-xs text-[#315b84]">{message}</p> : null}
            {error ? <p className="text-xs text-rose-700">{error}</p> : null}
          </div>
        </section>

        <section className="tp-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#153a6a]">저장된 DB entry</h2>
          <p className="mt-2 text-xs text-[#5a7398]">
            default 항목을 숨기거나 이름을 바꾸려면 같은 code로 override를 저장하면 됩니다.
          </p>
          <div className="mt-4 space-y-4">
            {PET_SPECIES_VALUES.map((species) => {
              const entries = groupedAdminEntries[species];
              return (
                <article key={species} className="rounded-xl border border-[#d9e5f4] bg-[#fbfdff] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[#1f3f71]">
                      {getPetSpeciesLabel(species)}
                    </h3>
                    <span className="text-[11px] text-[#5a7398]">{entries.length}개 저장됨</span>
                  </div>
                  {entries.length === 0 ? (
                    <p className="mt-3 text-xs text-[#5a7398]">저장된 DB entry가 없습니다.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-lg border border-[#cadbf3] bg-white px-3 py-3 text-xs text-[#355988]"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-semibold text-[#1f3f71]">
                                {entry.labelKo} ({entry.code})
                              </p>
                              <p className="mt-0.5 text-[11px] text-[#5a7398]">
                                {entry.source === "override" ? "기본 사전 override" : "custom entry"}
                                {" · "}
                                {entry.isActive ? "활성" : "비활성"}
                                {" · "}
                                {getPetSizeClassLabel(entry.defaultSize, { includeUnknown: true })}
                              </p>
                              {entry.aliases.length > 0 ? (
                                <p className="mt-1 text-[11px] text-[#5a7398]">
                                  별칭: {entry.aliases.join(", ")}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditPersisted(entry)}
                                className="tp-btn-soft px-3 py-1.5 text-[11px]"
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(entry.id)}
                                className="tp-btn-soft px-3 py-1.5 text-[11px] text-rose-700 hover:bg-rose-50"
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
