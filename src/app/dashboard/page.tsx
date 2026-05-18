import { Sidebar } from "@/components/shared/Sidebar";
import { requireAuth } from "@/middleware/auth.middleware";
import { getInitials } from "@/utils/format";

export default async function DashboardPage() {
  const session = await requireAuth("/dashboard");

  return (
    <section className="grid min-h-[calc(100vh-72px)] md:grid-cols-[240px_1fr]">
      <Sidebar />
      <div className="grid content-start gap-7 p-6 md:p-10 lg:p-14">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-xl font-black text-white">
            {getInitials(session.user.name, session.user.email)}
          </div>
          <div>
            <p className="mb-2 text-xs font-extrabold uppercase text-orange-600">
              Protected page
            </p>
            <h1 className="text-3xl font-black leading-tight text-neutral-950 md:text-4xl">
              Welcome, {session.user.name ?? session.user.email}
            </h1>
            <p className="mt-2 text-neutral-600">
              You can only see this page after signing in.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="grid gap-2 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
            <span className="text-sm text-neutral-600">Auth method</span>
            <strong className="text-xl">Email or Google</strong>
          </article>
          <article className="grid gap-2 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
            <span className="text-sm text-neutral-600">Database</span>
            <strong className="text-xl">PostgreSQL</strong>
          </article>
          <article className="grid gap-2 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
            <span className="text-sm text-neutral-600">Session</span>
            <strong className="text-xl">Auth.js JWT</strong>
          </article>
        </div>
      </div>
    </section>
  );
}
