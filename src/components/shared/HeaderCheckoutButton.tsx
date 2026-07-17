"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { Clock3, CheckCircle2 } from "lucide-react";

export function HeaderCheckoutButton() {
  const [expectedTime, setExpectedTime] = useState<string | null>(null);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/attendance/checkout/status");
        if (!res.ok) return;
        const data = await res.json();
        if (data.ready === false) return;
        
        setExpectedTime(data.expectedCheckoutTime);
        setHasCheckedIn(data.hasCheckedIn);
        setHasCheckedOut(data.hasCheckedOut);
        setIsEligible(data.isEligible);
      } catch (err) {
        console.error("Failed to fetch checkout status", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  useEffect(() => {
    if (!expectedTime || hasCheckedOut || !hasCheckedIn) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentH = String(now.getHours()).padStart(2, "0");
      const currentM = String(now.getMinutes()).padStart(2, "0");
      const currentTimeStr = `${currentH}:${currentM}`;
      
      if (currentTimeStr >= expectedTime) {
        setIsEligible(true);
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [expectedTime, hasCheckedOut, hasCheckedIn]);

  if (loading || !hasCheckedIn) return null;

  if (hasCheckedOut) {
    return (
      <div className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-600 shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:bg-emerald-500/10 dark:text-emerald-400">
        <CheckCircle2 size={16} />
        <span>Checked Out Today</span>
      </div>
    );
  }

  if (isEligible) {
    return (
      <Button 
        onClick={() => router.push("/dashboard/attendance/check-out")}
        className="rounded-full border-0 bg-linear-to-r from-[#e85d4e] via-[#2c64f8] to-[#e0a325] text-white shadow-lg transition-opacity hover:opacity-90"
      >
        <Clock3 size={16} className="mr-2" />
        Check Out
      </Button>
    );
  }

  return null;
}
