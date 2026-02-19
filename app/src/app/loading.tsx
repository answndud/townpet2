import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-5">
        <Skeleton className="h-28 w-full border border-[#d6e2f3]" />
        <Skeleton className="h-20 w-full border border-[#d6e2f3]" />
        <Skeleton className="h-96 w-full border border-[#d6e2f3]" />
      </div>
    </div>
  );
}
