import { cn } from "@/utils/cn";

type LoadingSkeletonProps = {
  className?: string;
};

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-linear-to-r from-white/50 via-blue-500/10 to-white/50 dark:from-white/5 dark:via-blue-500/10 dark:to-white/5",
        className,
      )}
    />
  );
}
