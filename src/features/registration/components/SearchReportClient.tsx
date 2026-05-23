"use client";

import { FileSearch, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { RegistrationDetail } from "@/features/registration/components/RegistrationDetail";
import type { Registration } from "@/features/registration/types/registration.types";

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message ?? "Request failed.");
  }

  return data;
}

export function SearchReportClient() {
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [searchedValue, setSearchedValue] = useState("");
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = trackingNumber.trim();
    if (!value) {
      setError("Tracking number is required.");
      return;
    }

    setLoading(true);
    setError("");
    setSearched(true);
    setSearchedValue(value);
    setRegistration(null);

    try {
      const data = await parseResponse(
        await fetch(`/api/registrations/tracking/${encodeURIComponent(value)}`),
      );
      setRegistration(data.registration);
    } catch (requestError) {
      if (requestError instanceof Error && requestError.message === "Registration not found.") {
        setRegistration(null);
      } else {
        setError(requestError instanceof Error ? requestError.message : "Unable to search registration.");
      }
    } finally {
      setLoading(false);
    }
  }

  function createNewRegistration() {
    router.push(
      `/dashboard/revenue-registration/new?trackingNumber=${encodeURIComponent(searchedValue)}`,
    );
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[28px] border border-[color:var(--border)] bg-white/75 p-6 shadow-[var(--shadow-card)] dark:bg-white/5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Search / Report</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Tracking number search</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-soft">
            Search a manual tracking, bill, receipt, or external reference number.
          </p>
        </div>
        <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 md:flex-row">
          <div className="flex-1">
            <Input
              label="Tracking Number"
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              placeholder="Enter tracking number"
              required
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full md:w-auto" disabled={loading}>
              <Search size={18} /> {loading ? "Searching..." : "Search"}
            </Button>
          </div>
        </form>
        {error ? (
          <p className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-200">
            {error}
          </p>
        ) : null}
      </section>

      {registration ? <RegistrationDetail registration={registration} /> : null}

      {searched && !loading && !registration && !error ? (
        <EmptyState
          icon={FileSearch}
          title="No registration found"
          description={`No registration exists for ${searchedValue}. Create one using this tracking number.`}
          action={
            <Button onClick={createNewRegistration}>
              <Plus size={18} /> Create New Registration
            </Button>
          }
        />
      ) : null}
    </div>
  );
}
