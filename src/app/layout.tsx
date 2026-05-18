import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SessionProvider } from "@/providers/SessionProvider";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Genius Attestions",
  description: "Authentication starter with Next.js, Prisma, and Auth.js.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
