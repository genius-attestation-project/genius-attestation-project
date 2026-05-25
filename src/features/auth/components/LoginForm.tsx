"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <div className="grid w-full min-w-0 gap-5 rounded-lg border border-stone-200 bg-white p-5 shadow-[0_24px_70px_rgba(22,32,29,0.12)] sm:gap-6 sm:p-8">
      <div className="grid gap-2">
        <h1 className="text-2xl font-black leading-tight sm:text-3xl">Welcome back</h1>
        <p className="text-neutral-600">Login to continue to your workspace.</p>
      </div>

      <form className="grid gap-4" action={onSubmit}>
        <Input label="Email" name="email" type="email" autoComplete="email" required />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        {message ? <p className="text-sm text-red-700">{message}</p> : null}
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
