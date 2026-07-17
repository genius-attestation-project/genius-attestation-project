"use client";

import { Edit3, MapPinHouse, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Input } from "@/components/ui/Input";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import type { OfficeLocationRow } from "@/features/admin/types/rbac.types";
import { Country } from "country-state-city";

type OfficeLocationFormState = {
  officeName: string;
  location: string;
  timezone: string;
  employees: string;
  isProcessOffice: boolean;
};

const defaultFormState: OfficeLocationFormState = {
  officeName: "",
  location: "",
  timezone: "",
  employees: "",
  isProcessOffice: false,
};

const countryOptions = Country.getAllCountries().map((c) => ({
  label: c.name,
  value: c.name,
}));
export function OfficeLocationManagement() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [officeLocations, setOfficeLocations] = useState<OfficeLocationRow[]>([]);
  const [editingOfficeLocation, setEditingOfficeLocation] = useState<OfficeLocationRow | null>(null);
  const [formState, setFormState] = useState<OfficeLocationFormState>(defaultFormState);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const availableTimezones = useMemo(() => {
    const selectedCountry = Country.getAllCountries().find(c => c.name === formState.location);
    return selectedCountry?.timezones ? selectedCountry.timezones.map(tz => tz.zoneName) : [];
  }, [formState.location]);

  useEffect(() => {
    if (availableTimezones.length === 1) {
      setFormState(f => ({ ...f, timezone: availableTimezones[0] }));
    } else if (availableTimezones.length > 1 && formState.timezone && !availableTimezones.includes(formState.timezone)) {
      setFormState(f => ({ ...f, timezone: "" }));
    } else if (availableTimezones.length === 0) {
      setFormState(f => ({ ...f, timezone: "" }));
    }
  }, [availableTimezones, formState.timezone]);
  useEffect(() => {
    void loadOfficeLocations();
  }, []);

  async function loadOfficeLocations() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/office-locations", { cache: "no-store" });
      const payload = (await response.json()) as {
        officeLocations?: OfficeLocationRow[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to load office locations.");
      }

      setOfficeLocations(payload.officeLocations ?? []);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load office locations.";
      console.error("Failed to load office locations:", message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function openCreateDrawer() {
    setEditingOfficeLocation(null);
    setFormState(defaultFormState);
    setError("");
    setIsDrawerOpen(true);
  }

  function openEditDrawer(officeLocation: OfficeLocationRow) {
    setEditingOfficeLocation(officeLocation);
    setFormState({
      officeName: officeLocation.officeName,
      location: officeLocation.location,
      timezone: officeLocation.timezone,
      employees: String(officeLocation.employees),
      isProcessOffice: officeLocation.isProcessOffice,
    });
    setError("");
    setIsDrawerOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    if (!formState.location) {
      setError("Country is required.");
      setSubmitting(false);
      return;
    }

    if (!formState.timezone) {
      setError("Timezone is required.");
      setSubmitting(false);
      return;
    }

    if (officeLocations.some(o => 
      o.officeName.toLowerCase().trim() === formState.officeName.toLowerCase().trim() && 
      o.location === formState.location && 
      o.id !== editingOfficeLocation?.id
    )) {
      setError("An office with this name already exists in the selected country.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(
        editingOfficeLocation
          ? `/api/office-locations/${editingOfficeLocation.id}`
          : "/api/office-locations",
        {
          method: editingOfficeLocation ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formState,
            employees: formState.employees === "" ? 0 : Number(formState.employees),
          }),
        },
      );
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to save office location.");
      }

      await loadOfficeLocations();
      setIsDrawerOpen(false);
      setMessage(editingOfficeLocation ? "Office location updated successfully." : "Office location created successfully.");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to save office location.";
      console.error("Failed to save office location:", message);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(officeLocation: OfficeLocationRow) {
    const shouldDelete = window.confirm(`Delete office location "${officeLocation.officeName}"?`);

    if (!shouldDelete) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/office-locations/${officeLocation.id}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to delete office location.");
      }

      await loadOfficeLocations();
      setMessage("Office location deleted successfully.");
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Unable to delete office location.";
      console.error("Failed to delete office location:", message);
      setError(message);
    }
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader
        eyebrow="Office Location Module"
        title="Global office location management"
        description="Maintain database-backed office names, locations, and timezones in one premium workspace."
        actions={
          <Button onClick={openCreateDrawer}>
            <Plus size={16} />
            Add Office
          </Button>
        }
      />

      {message ? (
        <DashboardCard>
          <p className="text-sm font-semibold text-blue-600">{message}</p>
        </DashboardCard>
      ) : null}

      {error ? (
        <DashboardCard>
          <p className="text-sm font-semibold text-rose-600">{error}</p>
        </DashboardCard>
      ) : null}

      <DashboardCard title="Office Directory" description="Real office locations saved in the workspace database.">
        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <LoadingSkeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : officeLocations.length === 0 ? (
          <EmptyState
            icon={MapPinHouse}
            title="No office locations found"
            description="Office locations will appear here once they are added to the workspace."
            action={<Button onClick={openCreateDrawer}>Add Office</Button>}
          />
        ) : (
          <DataTable
            keyField="id"
            rows={officeLocations}
            columns={[
              {
                key: "officeName",
                label: "Office Name",
                render: (row) => (
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                      <MapPinHouse size={18} />
                    </span>
                    <p className="font-extrabold">{String(row.officeName)}</p>
                  </div>
                ),
              },
              { key: "location", label: "Location" },
              { key: "timezone", label: "Timezone" },
              { key: "employees", label: "Employees" },
              { 
                key: "isProcessOffice", 
                label: "Office Type",
                render: (row) => (
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${row.isProcessOffice ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                    {row.isProcessOffice ? "Process Office" : "Normal Office"}
                  </span>
                ),
              },
              { key: "createdDate", label: "Created Date" },
              {
                key: "actions",
                label: "Actions",
                render: (row) => {
                  const officeLocation = row as OfficeLocationRow;

                  return (
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditDrawer(officeLocation)}>
                        <Edit3 size={16} />
                      </Button>
                      <Button variant="danger" size="icon" onClick={() => void handleDelete(officeLocation)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  );
                },
              },
            ]}
          />
        )}
      </DashboardCard>

      <FormDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingOfficeLocation ? "Edit Office Location" : "Add Office Location"}
        description="Save office names, locations, and timezone details to the workspace database."
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Input
            label="Office Name"
            name="officeName"
            value={formState.officeName}
            onChange={(event) => setFormState((current) => ({ ...current, officeName: event.target.value }))}
            placeholder="Kochi HQ"
          />
          <div className="grid gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Country
            </label>
            <SearchableSelect
              value={formState.location}
              onChange={(val) => setFormState((current) => ({ ...current, location: val }))}
              options={countryOptions}
              placeholder="Select country"
            />
          </div>
          {availableTimezones.length <= 1 ? (
            <Input
              label="Timezone"
              name="timezone"
              value={formState.timezone}
              readOnly
              placeholder={availableTimezones.length === 0 ? "Select a country first" : ""}
              onChange={() => {}}
            />
          ) : (
            <div className="grid gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Timezone
              </label>
              <SearchableSelect
                value={formState.timezone}
                onChange={(val) => setFormState((current) => ({ ...current, timezone: val }))}
                options={availableTimezones.map(tz => ({ label: tz, value: tz }))}
                placeholder="Select timezone"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isProcessOffice"
              name="isProcessOffice"
              checked={formState.isProcessOffice}
              onChange={(event) => setFormState((current) => ({ ...current, isProcessOffice: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-950 dark:checked:bg-blue-500"
            />
            <label htmlFor="isProcessOffice" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Is Process Office
            </label>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : editingOfficeLocation ? "Update Office" : "Save Office"}
            </Button>
          </div>
        </form>
      </FormDrawer>
    </div>
  );
}
