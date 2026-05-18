import Link from "next/link";

export function Sidebar() {
  const itemClass =
    "rounded-lg px-3 py-3 font-bold text-neutral-600 transition hover:bg-white hover:text-neutral-950";

  return (
    <aside className="flex gap-2 overflow-x-auto border-b border-stone-200 bg-emerald-50 px-5 py-4 md:flex-col md:border-b-0 md:border-r md:p-7">
      <Link className={itemClass} href="/dashboard">
        Overview
      </Link>
      <Link className={itemClass} href="/dashboard">
        Attestations
      </Link>
      <Link className={itemClass} href="/dashboard">
        Settings
      </Link>
    </aside>
  );
}
