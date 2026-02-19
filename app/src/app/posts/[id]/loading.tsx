import { Skeleton } from "@/components/ui/skeleton";

export default function PostDetailLoading() {
  return (
    <div className="min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
        <Skeleton className="h-6 w-24" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="h-[520px] w-full border border-[#d6e2f3]" />
          <div className="space-y-4">
            <Skeleton className="h-44 w-full border border-[#d6e2f3]" />
            <Skeleton className="h-36 w-full border border-[#d6e2f3]" />
          </div>
        </div>
        <Skeleton className="h-56 w-full border border-[#d6e2f3]" />
      </main>
    </div>
  );
}
