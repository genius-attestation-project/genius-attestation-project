import type { ReactNode } from "react";

import { Navbar } from "@/components/shared/Navbar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}
