"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FileSearch,
  Search,
  RefreshCw,
  Building2,
  MapPin,
  Layers,
  Inbox,
  Send,
  FileCheck,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DocumentMovementDetailsModal } from "./DocumentMovementDetailsModal";
import type { BmTrackingTab, BmLocationSection } from "../server/bm-tracking.service";

type BmReportDashboardProps = {
  currentOfficeLocationName: string;
};

const TABS: Array<{ id: BmTrackingTab; label: string; icon: any }> = [
  { id: "in_hand", label: "Document In Hand", icon: Layers },
  { id: "inbound", label: "Inbound", icon: Inbox },
  { id: "outbound", label: "Outbound", icon: Send },
  { id: "registered", label: "Registered", icon: FileCheck },
  { id: "sub_packages", label: "Sub Packages", icon: Package },
];

export function BmReportDashboard({ currentOfficeLocationName }: BmReportDashboardProps) {
  const [offices, setOffices] = useState<string[]>([]);
  const [selectedOffice, setSelectedOffice] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<BmTrackingTab>("in_hand");
  const [searchQuery, setSearchQuery] = useState("");
  const [sections, setSections] = useState<BmLocationSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTrackingNumber, setSelectedTrackingNumber] = useState<string | null>(null);

  // Fetch list of Registration Offices
  const fetchOffices = useCallback(async () => {
    try {
      const res = await fetch("/api/bm-report/tracking?action=offices");
      if (res.ok) {
        const data = await res.json();
        if (data.offices && Array.isArray(data.offices)) {
          setOffices(data.offices);
          if (data.offices.length > 0 && selectedOffice === "all") {
            // Set default office to user's current office if present, otherwise all
            const match = data.offices.find(
              (o: string) => o.toLowerCase() === currentOfficeLocationName?.toLowerCase()
            );
            if (match) {
              setSelectedOffice(match);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to load registration offices", err);
    }
  }, [currentOfficeLocationName, selectedOffice]);

  // Fetch sections data for selected office, tab, and search
  const fetchTrackingData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedOffice && selectedOffice !== "all") {
        params.set("registrationOffice", selectedOffice);
      }
      params.set("tab", activeTab);
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const res = await fetch(`/api/bm-report/tracking?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSections(data.sections || []);
      } else {
        setSections([]);
      }
    } catch (err) {
      console.error("Failed to load BM location tracking data", err);
      setSections([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedOffice, activeTab, searchQuery]);

  useEffect(() => {
    fetchOffices();
  }, [fetchOffices]);

  useEffect(() => {
    fetchTrackingData();
  }, [fetchTrackingData]);

  // Total count of documents across all current sections
  const totalDocuments = sections.reduce((acc, sec) => acc + (sec.documents?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <FileSearch className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              BM Location Tracking
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Track the exact location and current section of registered documents
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchTrackingData}
            disabled={isLoading}
            className="rounded-xl"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Top Filter Bar: Single Registration Office Filter & Search */}
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-12 dark:border-slate-800 dark:bg-slate-900">
        <div className="md:col-span-5">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Registration Office
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-8 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-blue-400"
            >
              <option value="all">All Registration Offices</option>
              {offices.map((office) => (
                <option key={office} value={office}>
                  {office}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="md:col-span-7">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Search Documents
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Tracking Number, Customer Name, Document Name, Mobile..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-blue-400"
            />
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 dark:bg-blue-500"
                  : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium text-slate-500">Loading document location tracking...</p>
          </div>
        </div>
      ) : sections.length === 0 || totalDocuments === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 px-4 text-center dark:border-slate-800 dark:bg-slate-900">
          <FileSearch className="h-12 w-12 text-slate-400" />
          <h3 className="mt-3 text-lg font-bold text-slate-800 dark:text-white">No documents found.</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm">
            There are no documents matching the selected Registration Office and section.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((sec) => {
            if (!sec.documents || sec.documents.length === 0) return null;
            return (
              <div
                key={sec.locationName}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Section Heading Bar */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {sec.locationName}
                    </h2>
                  </div>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    {sec.documents.length} {sec.documents.length === 1 ? "Document" : "Documents"}
                  </span>
                </div>

                {/* 11 Column Document Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-100/60 text-xs font-bold tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3 text-center">SL No</th>
                        <th className="px-4 py-3">Tracking Number</th>
                        <th className="px-4 py-3">Registration Date</th>
                        <th className="px-4 py-3">Document Name</th>
                        <th className="px-4 py-3">Registration Office</th>
                        <th className="px-4 py-3">Collected Person</th>
                        <th className="px-4 py-3 text-center">Number of Days</th>
                        <th className="px-4 py-3">Delivery At</th>
                        <th className="px-4 py-3">Document Type</th>
                        <th className="px-4 py-3">Process Type</th>
                        <th className="px-4 py-3 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 dark:divide-slate-800 dark:text-slate-200">
                      {sec.documents.map((doc, idx) => (
                        <tr
                          key={doc.id || doc.trackingNumber + idx}
                          className="hover:bg-blue-50/40 transition-colors dark:hover:bg-blue-950/20"
                        >
                          <td className="px-4 py-3.5 text-center font-semibold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3.5 font-bold">
                            <button
                              type="button"
                              onClick={() => setSelectedTrackingNumber(doc.trackingNumber)}
                              className="font-mono text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {doc.trackingNumber}
                            </button>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                            {doc.registrationDate}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white">
                            {doc.documentName}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            {doc.registrationOffice}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            {doc.collectedPerson}
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <span className="inline-flex rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                              {doc.numberOfDays}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            {doc.deliveryAt}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            {doc.documentType}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                            {doc.processType}
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-slate-900 dark:text-white">
                            {doc.totalAmount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Movement Details Timeline Modal */}
      {selectedTrackingNumber && (
        <DocumentMovementDetailsModal
          trackingNumber={selectedTrackingNumber}
          onClose={() => setSelectedTrackingNumber(null)}
        />
      )}
    </div>
  );
}
