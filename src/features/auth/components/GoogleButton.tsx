"use client";

import { signIn } from "next-auth/react";
import { FcGoogle } from "react-icons/fc";

import { Button } from "@/components/ui/Button";

export function GoogleButton({ callbackUrl = "/dashboard" }: { callbackUrl?: string }) {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => signIn("google", { callbackUrl })}
      className="w-full"
    >
      <FcGoogle size={20} />
      Continue with Google
    </Button>
  );
}
