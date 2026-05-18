"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader } from "@/components/ui/Loader";
import { GoogleButton } from "@/features/auth/components/GoogleButton";

export function RegisterForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(formData: FormData) {
    setMessage("");
    setIsSubmitting(true);

    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        email,
        password,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      setMessage(data?.message ?? "Registration failed.");
      setIsSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      router.push("/login");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="grid w-full max-w-[440px] gap-6 rounded-lg border border-stone-200 bg-white p-7 shadow-[0_18px_50px_rgba(22,32,29,0.09)]">
      <div className="grid gap-2">
        <h1 className="text-3xl font-black leading-tight">Create account</h1>
        <p className="text-neutral-600">Register with email and password.</p>
      </div>

      <form className="grid gap-4" action={onSubmit}>
        <Input label="Name" name="name" type="text" autoComplete="name" required />
        <Input label="Email" name="email" type="email" autoComplete="email" required />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        {message ? <p className="text-sm text-red-700">{message}</p> : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader /> : "Create account"}
        </Button>
      </form>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-neutral-500 before:h-px before:bg-stone-200 before:content-[''] after:h-px after:bg-stone-200 after:content-['']">
        or
      </div>
      <GoogleButton />
    </div>
  );
}
