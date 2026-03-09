export default function AdoptionBoardLoading() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#fdfefe_42%,#fbfdff_100%)] pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <div className="h-44 animate-pulse rounded-[32px] border border-[#eadfba] bg-[linear-gradient(135deg,#fff4d0,#fffdf7_52%,#eef7ff)]" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`adoption-loading-card-${index}`}
              className="overflow-hidden rounded-[28px] border border-[#d9e6f7] bg-white"
            >
              <div className="aspect-[4/3] animate-pulse bg-[#eef4fb]" />
              <div className="space-y-3 p-4">
                <div className="h-3 w-24 animate-pulse rounded bg-[#eef4fb]" />
                <div className="h-6 w-4/5 animate-pulse rounded bg-[#eef4fb]" />
                <div className="h-4 w-3/5 animate-pulse rounded bg-[#eef4fb]" />
                <div className="h-16 animate-pulse rounded-2xl bg-[#f6f9fd]" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
