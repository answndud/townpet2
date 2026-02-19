type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`animate-pulse bg-[#d9e4f5] ${className}`.trim()} />;
}
