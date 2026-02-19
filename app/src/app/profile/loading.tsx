import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <Skeleton className="h-36 w-full border border-[#d6e2f3]" />
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-28 border border-[#d6e2f3]" />
          <Skeleton className="h-28 border border-[#d6e2f3]" />
          <Skeleton className="h-28 border border-[#d6e2f3]" />
        </div>
        <Skeleton className="h-56 w-full border border-[#d6e2f3]" />
        <Skeleton className="h-56 w-full border border-[#d6e2f3]" />
      </main>
    </div>
  );
}
