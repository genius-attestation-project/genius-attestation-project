"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader } from "@/components/ui/Loader";
import { GoogleButton } from "@/features/auth/components/GoogleButton";
import { getAuthErrorMessage } from "@/features/auth/utils/auth.helper";

type LoginFormProps = {
  callbackUrl?: string;
  error?: string | null;
};

export function LoginForm({ callbackUrl = "/dashboard", error }: LoginFormProps) {
  const [message, setMessage] = useState(getAuthErrorMessage(error ?? null));
  const [toastMessage, setToastMessage] = useState(
    error === "AccessDenied" ? getAuthErrorMessage(error) : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const nextMessage = getAuthErrorMessage(error ?? null);
    setMessage(nextMessage);

    if (error !== "AccessDenied") {
      setToastMessage("");
      return;
    }

    setToastMessage(nextMessage);
    const timeoutId = window.setTimeout(() => setToastMessage(""), 6000);

    return () => window.clearTimeout(timeoutId);
  }, [error]);

  async function onSubmit(formData: FormData) {
    setMessage("");
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      callbackUrl,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      console.error("[auth] Credentials sign-in failed.", {
        error: result.error,
      });
      setMessage("Invalid email or password.");
      return;
    }

    const destination = result?.url ?? callbackUrl;

    if (!destination) {
      setMessage("Login succeeded but no redirect destination was returned.");
      return;
    }

    console.info("[auth] Credentials sign-in succeeded, redirecting.", {
      destination,
    });

    window.location.assign(destination);
  }

  return (
    <div className="relative grid w-full min-w-0 gap-5 rounded-lg border border-slate-300 bg-white p-5 text-slate-950 shadow-[0_24px_70px_rgba(22,32,29,0.12)] [--border:rgba(15,23,42,0.18)] [--ring:rgba(37,99,235,0.18)] [--text-muted:#64748b] [--text:#0f172a] sm:gap-6 sm:p-8">
      {toastMessage ? (
        <div
          className="fixed right-4 top-4 z-50 max-w-[calc(100vw-2rem)] rounded-lg border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 shadow-[0_18px_50px_rgba(127,29,29,0.18)] sm:max-w-sm"
          role="alert"
        >
          {toastMessage}
        </div>
      ) : null}

      <div className="grid gap-2">
        <h1 className="text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
          Welcome back
        </h1>
        <p className="text-slate-700">Login to continue to your workspace.</p>
      </div>

      <form className="grid gap-4" action={onSubmit}>
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          className="border-slate-300 bg-white text-slate-950 shadow-sm placeholder:text-slate-400 focus:border-blue-500"
          required
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="border-slate-300 bg-white text-slate-950 shadow-sm placeholder:text-slate-400 focus:border-blue-500"
          required
        />
        {message ? (
          <p className="text-sm text-red-700" role="alert">
            {message}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader /> : "Login"}
        </Button>
      </form>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-neutral-500 before:h-px before:bg-stone-200 before:content-[''] after:h-px after:bg-stone-200 after:content-['']">
        or
      </div>
      <GoogleButton callbackUrl={callbackUrl} />
    </div>
  );
}
