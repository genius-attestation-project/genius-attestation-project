import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { SearchBar } from "@/components/ui/SearchBar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { signOut } from "@/lib/auth";
import { getInitials } from "@/utils/format";

type NavbarProps = {
  userName?: string | null;
  userEmail?: string | null;
};

export function Navbar({ userName, userEmail }: NavbarProps) {
  const currentDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <header className="glass-panel sticky top-0 z-30 flex min-h-[64px] min-w-0 flex-col gap-3 rounded-2xl border border-[color:var(--border)] px-3 py-3 sm:px-4 md:px-5 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-w-0 flex-1 items-center">
        <SearchBar
          placeholder="Search modules, reports, or records"
          className="w-full xl:max-w-xl"
          global
        />
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3 xl:justify-end">
        <div className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-white/80 px-3 py-2 text-sm font-semibold text-soft dark:bg-white/5">
          <CalendarDays size={16} className="text-blue-600" />
          <span className="whitespace-nowrap">{currentDate}</span>
        </div>
        <ThemeToggle />
        <div className="hidden items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-white/80 px-3 py-2 dark:bg-white/5 md:flex">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600 to-sky-500 text-sm font-extrabold text-white">
            {getInitials(userName, userEmail)}
          </div>
          <div className="max-w-44">
            <p className="truncate text-sm font-extrabold">{userName ?? "Workspace User"}</p>
            <p className="truncate text-xs text-soft">{userEmail}</p>
          </div>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <Button variant="ghost" className="max-sm:px-3">Sign out</Button>
        </form>
      </div>
    </header>
  );
}
