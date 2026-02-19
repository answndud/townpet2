import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <Skeleton className="h-32 w-full border border-[#d6e2f3]" />
        <Skeleton className="h-28 w-full border border-[#d6e2f3]" />
        <Skeleton className="h-80 w-full border border-[#d6e2f3]" />
      </main>
    </div>
  );
}
