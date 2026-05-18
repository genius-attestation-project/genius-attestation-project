import Link from "next/link";

import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

export async function Navbar() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-10 flex min-h-[72px] items-center justify-between border-b border-stone-200 bg-white/85 px-5 py-3 backdrop-blur md:px-12 lg:px-[72px]">
      <Link className="text-lg font-extrabold" href="/">
        Genius Attestions
      </Link>
      <nav
        className="flex items-center gap-3 text-sm font-bold text-neutral-700"
        aria-label="Primary"
      >
        {session?.user ? (
          <>
            <Link className="rounded-lg px-3 py-2 hover:bg-stone-100" href="/dashboard">
              Dashboard
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button type="submit" variant="ghost">
                Sign out
              </Button>
            </form>
          </>
        ) : (
          <>
            <Link className="rounded-lg px-3 py-2 hover:bg-stone-100" href="/login">
              Login
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-700 bg-emerald-700 px-4 font-bold text-white transition hover:bg-emerald-800"
              href="/register"
            >
              Register
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
