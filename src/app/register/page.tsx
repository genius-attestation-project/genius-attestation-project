import Link from "next/link";
import Image from "next/image";

import { RegisterForm } from "@/features/auth/components/RegisterForm";

export default function RegisterPage() {
  return (
    <section className="grid min-h-screen overflow-x-hidden bg-white lg:grid-cols-[1.05fr_0.95fr]">
      <div className="relative min-h-56 overflow-hidden bg-neutral-950 sm:min-h-64 lg:min-h-full">
        <Image
          src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1400&q=80"
          alt="Team discussing dashboard data in a premium workspace"
          fill
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-neutral-950/80 via-neutral-950/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-10 lg:p-12">
          <p className="max-w-md text-2xl font-black leading-tight sm:text-4xl">
            Build your Genius ERP workspace
          </p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/80 sm:text-base">
            Create a secure account and step into the new premium operations dashboard.
          </p>
        </div>
      </div>

      <div className="flex min-w-0 items-center justify-center px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
        <div className="w-full max-w-[440px]">
          <RegisterForm />
          <p className="mt-6 text-center text-neutral-600">
            Already have an account?{" "}
            <Link className="font-extrabold text-blue-600" href="/login">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
