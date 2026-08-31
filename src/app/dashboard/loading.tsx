export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse p-1">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-6 shadow-xs border border-slate-200/80 dark:border-white/10 dark:bg-[#0f1623]">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-slate-200 dark:bg-white/10" />
          <div className="h-4 w-72 rounded-md bg-slate-100 dark:bg-white/5" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-36 rounded-xl bg-slate-200 dark:bg-white/10" />
          <div className="h-9 w-28 rounded-xl bg-slate-200 dark:bg-white/10" />
        </div>
      </div>

      {/* Tabs / Controls Bar Skeleton */}
      <div className="flex gap-2 border-b border-slate-200/80 bg-slate-100/80 p-1.5 rounded-2xl dark:border-white/10 dark:bg-white/5">
        <div className="h-10 w-36 rounded-xl bg-white dark:bg-white/10 shadow-xs" />
        <div className="h-10 w-36 rounded-xl bg-slate-200/60 dark:bg-white/5" />
        <div className="h-10 w-36 rounded-xl bg-slate-200/60 dark:bg-white/5" />
      </div>

      {/* Content Table / Cards Skeleton */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#0f1623] space-y-4">
        <div className="flex items-center justify-between gap-4 pb-2">
          <div className="h-10 w-80 rounded-xl bg-slate-100 dark:bg-white/5" />
          <div className="flex gap-2">
            <div className="h-10 w-24 rounded-xl bg-slate-100 dark:bg-white/5" />
            <div className="h-10 w-24 rounded-xl bg-slate-100 dark:bg-white/5" />
          </div>
        </div>

        {/* Table Rows Skeleton */}
        <div className="space-y-3 pt-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-white/5"
            >
              <div className="flex items-center gap-4">
                <div className="h-4 w-4 rounded-md bg-slate-200 dark:bg-white/10" />
                <div className="h-4 w-28 rounded-md bg-slate-200 dark:bg-white/10 font-mono" />
                <div className="h-4 w-40 rounded-md bg-slate-100 dark:bg-white/5" />
              </div>
              <div className="flex items-center gap-6">
                <div className="h-4 w-24 rounded-md bg-slate-100 dark:bg-white/5" />
                <div className="h-4 w-20 rounded-md bg-slate-200 dark:bg-white/10" />
                <div className="h-7 w-20 rounded-lg bg-blue-100/60 dark:bg-blue-500/20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
