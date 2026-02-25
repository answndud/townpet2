"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { setPrimaryNeighborhoodAction } from "@/server/actions/user";

type NeighborhoodOption = {
  id: string;
  name: string;
  city: string;
  district: string;
};

function toRegionKey(city: string, district: string) {
  return `${city}::${district}`;
}

function resolvePrimaryRegionKey(
  neighborhoods: NeighborhoodOption[],
  primaryNeighborhoodId: string | null,
) {
  if (primaryNeighborhoodId) {
    const primary = neighborhoods.find((item) => item.id === primaryNeighborhoodId);
    if (primary) {
      return toRegionKey(primary.city, primary.district);
    }
  }

  if (neighborhoods[0]) {
    return toRegionKey(neighborhoods[0].city, neighborhoods[0].district);
  }

  return "";
}

type NeighborhoodSearchResponse =
  | {
      ok: true;
      data: {
        cities: string[];
        districts: string[];
        items: NeighborhoodOption[];
      };
    }
  | {
      ok: false;
      error: { code: string; message: string };
    };

type NeighborhoodPreferenceFormProps = {
  selectedNeighborhoods: NeighborhoodOption[];
  primaryNeighborhoodId: string | null;
};

export function NeighborhoodPreferenceForm({
  selectedNeighborhoods,
  primaryNeighborhoodId,
}: NeighborhoodPreferenceFormProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    Array.from(new Set(selectedNeighborhoods.map((item) => toRegionKey(item.city, item.district)))).slice(
      0,
      3,
    ),
  );
  const [primaryId, setPrimaryId] = useState(
    resolvePrimaryRegionKey(selectedNeighborhoods, primaryNeighborhoodId),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [cityFilter, setCityFilter] = useState("");
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [searchItems, setSearchItems] = useState<NeighborhoodOption[]>(
    selectedNeighborhoods.map((item) => ({
      ...item,
      id: toRegionKey(item.city, item.district),
      name: item.district,
    })),
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams();
      if (cityFilter) {
        params.set("city", cityFilter);
      }
      params.set("limit", "200");

      try {
        const response = await fetch(`/api/neighborhoods?${params.toString()}`, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as NeighborhoodSearchResponse;
        if (!response.ok || !payload.ok) {
          return;
        }

        setCityOptions(payload.data.cities);
        setSearchItems(payload.data.items);
      } catch (error) {
        if ((error as { name?: string }).name !== "AbortError") {
          setSearchItems([]);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cityFilter]);

  const selectedNeighborhoodMap = useMemo(() => {
    const map = new Map<string, NeighborhoodOption>();

    for (const item of selectedNeighborhoods) {
      map.set(toRegionKey(item.city, item.district), {
        ...item,
        id: toRegionKey(item.city, item.district),
        name: item.district,
      });
    }
    for (const item of searchItems) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    }

    return map;
  }, [searchItems, selectedNeighborhoods]);

  const toggleNeighborhood = (neighborhoodId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(neighborhoodId)) {
        const next = prev.filter((item) => item !== neighborhoodId);
        if (primaryId === neighborhoodId) {
          setPrimaryId(next[0] ?? "");
        }
        return next;
      }

      if (prev.length >= 3) {
        setMessage("동네는 최대 3개까지 선택할 수 있습니다.");
        return prev;
      }

      const next = [...prev, neighborhoodId];
      if (!primaryId) {
        setPrimaryId(neighborhoodId);
      }
      return next;
    });
  };

  const handleSave = () => {
    if (selectedIds.length === 0 || !primaryId) {
      setMessage("동네를 선택하고 대표 동네를 지정해 주세요.");
      return;
    }

    startTransition(async () => {
      setMessage(null);
      const result = await setPrimaryNeighborhoodAction({
        neighborhoodIds: selectedIds,
        primaryNeighborhoodId: primaryId,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setMessage("내 동네가 저장되었습니다.");
    });
  };

  return (
    <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-[#153a6a]">내 동네 설정</h2>
      <p className="mt-2 text-xs text-[#5a7398]">
        대한민국 시/군/구를 최대 3개까지 선택하고 대표 동네 1개를 지정할 수 있습니다.
      </p>

      <div className="mt-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-1">
          <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
            시/도
            <select
              className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
            >
              <option value="">전체</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="max-h-64 space-y-2 overflow-auto border border-[#bfd0ec] bg-[#f8fbff] p-3">
          {searchItems.map((neighborhood) => (
            <label key={neighborhood.id} className="flex items-center gap-2 text-xs text-[#1f3f71]">
              <input
                type="checkbox"
                checked={selectedIds.includes(neighborhood.id)}
                onChange={() => toggleNeighborhood(neighborhood.id)}
                disabled={!selectedIds.includes(neighborhood.id) && selectedIds.length >= 3}
              />
              <span>
                {neighborhood.city} {neighborhood.district}
              </span>
            </label>
          ))}
          {searchItems.length === 0 ? (
            <p className="text-xs text-[#5a7398]">조건에 맞는 동네가 없습니다.</p>
          ) : null}
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
          대표 동네
          <select
            className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
            value={primaryId}
            onChange={(event) => setPrimaryId(event.target.value)}
          >
            <option value="">선택</option>
            {selectedIds.map((id) => {
              const neighborhood = selectedNeighborhoodMap.get(id);
              if (!neighborhood) {
                return null;
              }

                return (
                  <option key={id} value={id}>
                    {neighborhood.city} {neighborhood.district}
                  </option>
                );
              })}
          </select>
        </label>

        <div className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
          <span>현재 선택한 동네</span>
          <div className="flex flex-wrap gap-2">
            {selectedIds.length === 0 ? (
              <span className="text-xs text-[#5a7398]">선택한 동네가 없습니다.</span>
            ) : (
              selectedIds.map((id) => {
                const neighborhood = selectedNeighborhoodMap.get(id);
                if (!neighborhood) {
                  return null;
                }

                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-2 border border-[#bfd0ec] bg-white px-3 py-1 text-xs text-[#1f3f71]"
                  >
                    {neighborhood.city} {neighborhood.district}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIds((prev) => {
                          const next = prev.filter((item) => item !== id);
                          if (primaryId === id) {
                            setPrimaryId(next[0] ?? "");
                          }
                          return next;
                        });
                      }}
                      className="text-[#5a7398] hover:text-[#153a6a]"
                      aria-label={`${neighborhood.city} ${neighborhood.district} 제거`}
                    >
                      x
                    </button>
                  </span>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || selectedIds.length === 0 || !primaryId}
          className="border border-[#3567b5] bg-[#3567b5] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2f5da4] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "저장 중..." : "동네 저장"}
        </button>
        {message ? <span className="text-xs text-[#4f678d]">{message}</span> : null}
      </div>
    </section>
  );
}
