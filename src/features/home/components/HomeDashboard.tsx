"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { formatDate, formatBundleNumber } from "@/utils/format";
import {
  Package,
  Send,
  Inbox,
  Clock,
  Search,
  CheckSquare,
  Square,
  Building2,
  FileText,
  User,
  Calendar,
  Layers,
  ArrowRightLeft,
  XCircle,
  CheckCircle2,
  Filter,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { DocumentInfoCard } from "@/components/ui/DocumentInfoCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { RetrieveConfirmationModal } from "@/features/document-movement/components/RetrieveConfirmationModal";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { PriorityDot } from "@/components/ui/PriorityDot";
import { BundlePreviewModal } from "@/components/ui/BundlePreviewModal";
import { ReceiveSelectionModal } from "@/components/ui/ReceiveSelectionModal";
import { calculateNumberOfDays, calculateFinishedDays } from "@/utils/days-calculator";
import { DestinationOfficeSelect } from "./DestinationOfficeSelect";

type HomeDashboardProps = {
  currentOfficeLocationName: string;
};

type OfficeOption = {
  id: string;
  officeName: string;
  category?: string;
  isAssignedOffice?: boolean;
};

type TabKey = "document_in_hand" | "inbound" | "outbound" | "history";

export function HomeDashboard({ currentOfficeLocationName }: HomeDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("document_in_hand");
  const [offices, setOffices] = useState<OfficeOption[]>([]);
  const [assignedOffices, setAssignedOffices] = useState<OfficeOption[]>([]);
  const [globalOffices, setGlobalOffices] = useState<OfficeOption[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>("");
  const [destinationOfficeId, setDestinationOfficeId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Data states
  const [inHandDocs, setInHandDocs] = useState<any[]>([]);
  const [inboundBundles, setInboundBundles] = useState<any[]>([]);
  const [outboundBundles, setOutboundBundles] = useState<any[]>([]);
  const [movementHistory, setMovementHistory] = useState<any[]>([]);

  // Selection state for Document In Hand
  const [selectedTrackingNumbers, setSelectedTrackingNumbers] = useState<string[]>([]);

  // Bundle Preview state before receiving
  const [previewBundle, setPreviewBundle] = useState<any | null>(null);

  // Receive Selection state for Inbound Receive button
  const [receiveSelectionBundle, setReceiveSelectionBundle] = useState<any | null>(null);

  // Popup Modal state for Inbound Bundle Details
  const [selectedBundle, setSelectedBundle] = useState<any | null>(null);
  const [bundleReceivedSelections, setBundleReceivedSelections] = useState<string[]>([]);
  const [isReceiving, setIsReceiving] = useState(false);

  // Retrieve Modal state
  const [retrieveBundle, setRetrieveBundle] = useState<any | null>(null);

  // Fetch offices
  useEffect(() => {
    async function loadOffices() {
      try {
        const res = await fetch("/api/offices/all");
        if (res.ok) {
          const body = await res.json();
          const list = body.offices || body.data || [];
          setOffices(list);
          setAssignedOffices(body.assignedOffices || []);
          setGlobalOffices(body.globalOffices || []);
          if (list.length > 0) {
            const current = list.find(
              (o: any) => o.officeName.toLowerCase() === currentOfficeLocationName.toLowerCase()
            );
            if (current) {
              setSelectedOfficeId(current.id);
            } else {
              setSelectedOfficeId(list[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load offices", err);
      }
    }
    loadOffices();
  }, [currentOfficeLocationName]);

  // Fetch active tab data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const officeParam = selectedOfficeId ? `&officeId=${selectedOfficeId}` : "";
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : "";
      const res = await fetch(`/api/home?section=${activeTab}${officeParam}${searchParam}`);
      if (res.ok) {
        const body = await res.json();
        if (activeTab === "document_in_hand") {
          setInHandDocs(body.data || []);
        } else if (activeTab === "inbound") {
          setInboundBundles(body.data || []);
        } else if (activeTab === "outbound") {
          setOutboundBundles(body.data || []);
        } else if (activeTab === "history") {
          setMovementHistory(body.data || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch Home data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setSelectedTrackingNumbers([]);
  }, [activeTab, selectedOfficeId, searchQuery]);

  const eligibleInHandDocs = useMemo(() => {
    return inHandDocs.filter((doc) => doc.canTransfer);
  }, [inHandDocs]);

  const { receivedDocs, registeredDocs } = useMemo(() => {
    const received: any[] = [];
    const registered: any[] = [];
    for (const doc of inHandDocs) {
      if (doc.inHandCategory === "RECEIVED") {
        received.push(doc);
      } else {
        registered.push(doc);
      }
    }
    return { receivedDocs: received, registeredDocs: registered };
  }, [inHandDocs]);

  // Checkbox helpers for Document In Hand
  const handleSelectAllInHand = () => {
    if (selectedTrackingNumbers.length === eligibleInHandDocs.length && eligibleInHandDocs.length > 0) {
      setSelectedTrackingNumbers([]);
    } else {
      setSelectedTrackingNumbers(eligibleInHandDocs.map((doc) => doc.trackingNumber || doc.registrationNumber));
    }
  };

  const handleToggleSelectInHand = (trackingNumber: string) => {
    setSelectedTrackingNumbers((prev) =>
      prev.includes(trackingNumber)
        ? prev.filter((t) => t !== trackingNumber)
        : [...prev, trackingNumber]
    );
  };

  const renderDocumentTable = (docs: any[], startIndex = 0) => {
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs bg-white dark:bg-slate-900/40">
        <table className="w-full min-w-300 text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50/90 dark:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3 w-10 text-center">
                <button onClick={handleSelectAllInHand} className="text-slate-600 dark:text-slate-400">
                  {selectedTrackingNumbers.length === eligibleInHandDocs.length && eligibleInHandDocs.length > 0 ? (
                    <CheckSquare className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Square className="h-5 w-5 text-slate-400" />
                  )}
                </button>
              </th>
              <th className="p-3 text-center w-12">SL No.</th>
              <th className="p-3 text-left">Tracking Number</th>
              <th className="p-3 text-center">Registration Date</th>
              <th className="p-3 text-left">Registration Office</th>
              <th className="p-3 text-left min-w-32.5">Document Name</th>
              <th className="p-3 text-left min-w-32.5">Document Type</th>
              <th className="p-3 text-left">Delivery At</th>
              <th className="p-3 text-left min-w-40">Process Type</th>
              <th className="p-3 text-center">Number Of Days</th>
              <th className="p-3 text-right">Total Amount</th>
              <th className="p-3 text-right">Advance Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {docs.map((doc: any, index: number) => {
              const tNum = doc.trackingNumber || doc.registrationNumber;
              const isSelected = selectedTrackingNumbers.includes(tNum);
              const isPendingApproval = Boolean(doc.hasMovementApprovalPending);
              const canMove = Boolean(doc.canTransfer);

              return (
                <tr
                  key={doc.id || tNum}
                  className={
                    isSelected
                      ? "bg-blue-50/50 dark:bg-blue-950/20"
                      : isPendingApproval
                      ? "bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/30"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }
                >
                  <td className="p-3 text-center">
                    {canMove ? (
                      <button
                        type="button"
                        onClick={() => handleToggleSelectInHand(tNum)}
                        className="text-slate-600 dark:text-slate-400 focus:outline-hidden"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5 text-slate-400" />
                        )}
                      </button>
                    ) : (
                      <div title="Movement approval pending" className="flex items-center justify-center">
                        <Square className="h-5 w-5 text-slate-300 dark:text-slate-600 cursor-not-allowed" />
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-center font-semibold text-slate-500">{startIndex + index + 1}</td>
                  <td className="p-3 text-left font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <PriorityDot priority={doc.priority} size={10} />
                      <Link
                        href={`/dashboard/document-details/${encodeURIComponent(tNum)}`}
                        className="font-mono hover:underline hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {tNum}
                      </Link>
                      {isPendingApproval && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                          Movement approval pending
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-center text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {formatDate(doc.createdDate || doc.createdAt)}
                  </td>
                  <td className="p-3 text-left text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {doc.regionOfRegistration || doc.sourceOffice || "Main"}
                  </td>
                  <td className="p-3 text-left font-semibold text-slate-900 dark:text-white min-w-32.5">
                    {doc.documentName || doc.customerName || doc.clientName || "-"}
                  </td>
                  <td className="p-3 text-left text-xs font-medium text-slate-800 dark:text-slate-300 leading-snug min-w-32.5">
                    {doc.documentType || "-"}
                  </td>
                  <td className="p-3 text-left text-xs text-slate-600 dark:text-slate-400">
                    {doc.deliveryLocation || "-"}
                  </td>
                  <td className="p-3 text-left text-xs font-bold text-blue-800 dark:text-blue-300 leading-snug min-w-40">
                    {doc.processType || doc.mainProcess || "-"}
                  </td>
                  <td className="p-3 text-center text-xs font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                    {calculateNumberOfDays(doc.receivedAt || doc.documentMovements?.[0]?.updatedAt || doc.createdAt)}
                  </td>
                  <td className="p-3 text-right text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    ₹{Number(doc.totalCharges || 0).toFixed(2)}
                  </td>
                  <td className="p-3 text-right text-xs font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                    ₹{Number(doc.advancePaid || 0).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Transfer Action -> Create Bundle
  const handleTransfer = async () => {
    if (selectedTrackingNumbers.length === 0) {
      alert("Please select at least one document to transfer.");
      return;
    }
    if (!destinationOfficeId) {
      alert("Please select a destination office.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transfer",
          trackingNumbers: selectedTrackingNumbers,
          fromOfficeId: selectedOfficeId,
          toOfficeId: destinationOfficeId,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Failed to transfer documents");
      }

      alert(`Bundle ${body.bundle?.bundleNumber || ""} created and transferred successfully!`);
      setSelectedTrackingNumbers([]);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Transfer error");
    } finally {
      setIsLoading(false);
    }
  };

  // Inbound Bundle click -> Open Details Modal
  const handleOpenBundleModal = (bundle: any) => {
    setSelectedBundle(bundle);
    setBundleReceivedSelections([]);
  };

  const handleToggleReceiveItem = (trackingNumber: string) => {
    setBundleReceivedSelections((prev) =>
      prev.includes(trackingNumber)
        ? prev.filter((t) => t !== trackingNumber)
        : [...prev, trackingNumber]
    );
  };

  // Confirm Receive (Full or Partial)
  const handleConfirmReceive = async () => {
    if (!selectedBundle) return;
    if (bundleReceivedSelections.length === 0) {
      alert("Please select at least one document to receive.");
      return;
    }

    try {
      setIsReceiving(true);
      const res = await fetch("/api/home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "receive",
          bundleId: selectedBundle.id,
          receivedTrackingNumbers: bundleReceivedSelections,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Failed to receive bundle");
      }

      if (body.isSplit) {
        alert(
          `Received ${bundleReceivedSelections.length} documents! Remaining ${body.remainingCount} documents split into new Bundle ${body.splitBundleNumber}.`
        );
      } else {
        alert(`Bundle ${body.bundleNumber} fully received!`);
      }

      setSelectedBundle(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Receive error");
    } finally {
      setIsReceiving(false);
    }
  };

  // Confirm Receive from ReceiveSelectionModal
  const handleConfirmReceiveSelection = async (selectedTrackingNumbers: string[]) => {
    if (!receiveSelectionBundle) return;
    try {
      setIsReceiving(true);
      const res = await fetch("/api/home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "receive",
          bundleId: receiveSelectionBundle.id,
          receivedTrackingNumbers: selectedTrackingNumbers,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Failed to receive bundle");
      }

      if (body.isSplit) {
        alert(
          `Received ${selectedTrackingNumbers.length} documents! Remaining ${body.remainingCount} documents split into new Bundle ${body.splitBundleNumber}.`
        );
      } else {
        alert(`Bundle ${body.bundleNumber} fully received!`);
      }

      setReceiveSelectionBundle(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Receive error");
    } finally {
      setIsReceiving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Office Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-6 shadow-xs border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Home Workflow</h1>
          <p className="text-sm text-slate-500">
            Enterprise bundle-based document transfer and movement management system
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-semibold text-slate-700">Office Location:</span>
          <select
            value={selectedOfficeId}
            onChange={(e) => setSelectedOfficeId(e.target.value)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Offices</option>
            {offices.map((off) => (
              <option key={off.id} value={off.id}>
                {off.officeName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 bg-slate-100/80 p-1.5 rounded-2xl">
        <button
          onClick={() => setActiveTab("document_in_hand")}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
            activeTab === "document_in_hand"
              ? "bg-white text-blue-600 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Package className="h-4 w-4" />
          Document In Hand
        </button>

        <button
          onClick={() => setActiveTab("inbound")}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
            activeTab === "inbound"
              ? "bg-white text-blue-600 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Inbox className="h-4 w-4" />
          Inbound Bundles
          {inboundBundles.length > 0 && (
            <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-bold">
              {inboundBundles.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("outbound")}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
            activeTab === "outbound"
              ? "bg-white text-blue-600 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Send className="h-4 w-4" />
          Outbound Bundles
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
            activeTab === "history"
              ? "bg-white text-blue-600 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Clock className="h-4 w-4" />
          Movement History
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        {/* Search Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tracking number, customer, document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 pl-9 pr-4 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* 1. DOCUMENT IN HAND TAB */}
        {activeTab === "document_in_hand" && (
          <div className="space-y-6">
            {/* Transfer Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-blue-50/80 border border-blue-200 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                <span>Selected: {selectedTrackingNumbers.length} documents</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600 tracking-wider">
                  Select Destination Office:
                </span>
                <DestinationOfficeSelect
                  offices={offices}
                  assignedOfficesInput={assignedOffices}
                  globalOfficesInput={globalOffices}
                  currentOfficeId={selectedOfficeId}
                  value={destinationOfficeId}
                  onChange={(id) => setDestinationOfficeId(id)}
                  disabled={isLoading}
                />

                <Button
                  onClick={handleTransfer}
                  disabled={selectedTrackingNumbers.length === 0 || !destinationOfficeId || isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-xl text-sm shadow-xs"
                >
                  <Send className="mr-2 h-4 w-4" />
                  TRANSFER
                </Button>
              </div>
            </div>

            {/* Document Tables by Section */}
            {inHandDocs.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No Documents In Hand"
                description="Newly registered or received documents for this office will appear here."
              />
            ) : (
              <div className="space-y-6">
                {/* Section A: Successfully Received Documents */}
                {receivedDocs.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Inbox className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                          Successfully Received Documents ({receivedDocs.length})
                        </h3>
                      </div>
                    </div>
                    {renderDocumentTable(receivedDocs, 0)}
                  </div>
                )}

                {/* Section B: Registered Heading and Documents */}
                {registeredDocs.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                          Registered ({registeredDocs.length})
                        </h3>
                      </div>
                    </div>
                    {renderDocumentTable(registeredDocs, receivedDocs.length)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. INBOUND BUNDLES TAB */}
        {activeTab === "inbound" && (
          <div>
            {inboundBundles.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No Inbound Bundles"
                description="There are currently no inbound document bundles waiting to be received."
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-700 tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-4 text-center w-12">SL No.</th>
                      <th className="p-4">Bundle Number</th>
                      <th className="p-4">From</th>
                      <th className="p-4 text-center">Date Received</th>
                      <th className="p-4 text-center">Finished Days</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {inboundBundles.map((bundle: any, index: number) => (
                      <tr key={bundle.id} className="hover:bg-slate-50">
                        <td className="p-4 text-center font-semibold text-slate-500">{index + 1}</td>
                        <td
                          onClick={() => setPreviewBundle(bundle)}
                          className="p-4 font-mono font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          {formatBundleNumber(bundle.bundleNumber)}
                        </td>
                        <td className="p-4 font-semibold text-slate-800">
                          {bundle.fromOffice?.officeName || "Origin Office"}
                        </td>
                        <td className="p-4 text-center text-xs text-slate-600">
                          {formatDate(bundle.createdAt)}
                        </td>
                        <td className="p-4 text-center text-xs font-bold text-amber-700">
                          {calculateFinishedDays(bundle.createdAt)}
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            size="sm"
                            onClick={() => setReceiveSelectionBundle(bundle)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                          >
                            Receive
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 3. OUTBOUND BUNDLES TAB */}
        {activeTab === "outbound" && (
          <div>
            {outboundBundles.length === 0 ? (
              <EmptyState
                icon={Send}
                title="No Outbound Bundles"
                description="Bundles created and transferred from this office will appear here."
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-700 tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-4 text-center w-12">SL No.</th>
                      <th className="p-4">Bundle Number</th>
                      <th className="p-4">From (Current Office)</th>
                      <th className="p-4">To (Destination Office)</th>
                      <th className="p-4 text-center">Date Sent</th>
                      <th className="p-4 text-center">Finished Days</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {outboundBundles.map((bundle: any, index: number) => {
                      const isFullyReceived = bundle.status === "Received";
                      const isRetrieved = bundle.status === "Retrieved";
                      const canRetrieve = !isFullyReceived && !isRetrieved;

                      return (
                        <tr key={bundle.id} className="hover:bg-slate-50">
                          <td className="p-4 text-center font-semibold text-slate-500">{index + 1}</td>
                          <td className="p-4 font-mono font-bold text-blue-600">
                            {formatBundleNumber(bundle.bundleNumber)}
                          </td>
                          <td className="p-4 font-semibold text-slate-800">
                            {bundle.fromOffice?.officeName || "Current Office"}
                          </td>
                          <td className="p-4 font-semibold text-slate-800">
                            {bundle.toOffice?.officeName || "Destination"}
                          </td>
                          <td className="p-4 text-center text-xs text-slate-600">
                            {formatDate(bundle.createdAt)}
                          </td>
                          <td className="p-4 text-center text-xs font-bold text-amber-700">
                            {calculateFinishedDays(bundle.createdAt)}
                          </td>
                          <td className="p-4 text-right">
                            {canRetrieve ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setRetrieveBundle(bundle)}
                                className="gap-1.5 text-xs text-blue-600 hover:bg-blue-50 border-blue-200"
                              >
                                <RotateCcw size={14} /> Retrieve
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled
                                title={
                                  isFullyReceived
                                    ? "Cannot retrieve because destination office has already received these documents."
                                    : "Already retrieved."
                                }
                                className="gap-1.5 text-xs opacity-50 cursor-not-allowed"
                              >
                                <RotateCcw size={14} /> Retrieve
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 4. MOVEMENT HISTORY TAB */}
        {activeTab === "history" && (
          <div>
            {movementHistory.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No Movement History"
                description="All bundle and document movements are tracked here."
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-700 tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-4">Tracking Number</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Old Status</th>
                      <th className="p-4">New Status</th>
                      <th className="p-4">Performed By</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {movementHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-4 font-bold text-blue-600">
                          <div className="flex items-center gap-2">
                            <PriorityDot priority={item.priority || item.registration?.priority} size={10} />
                            <Link
                              href={`/dashboard/document-details/${encodeURIComponent(item.trackingNumber)}`}
                              className="font-mono hover:underline hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              {item.trackingNumber}
                            </Link>
                          </div>
                        </td>
                        <td className="p-4 font-semibold">{item.action}</td>
                        <td className="p-4 text-xs text-slate-500">{item.oldStatus || "-"}</td>
                        <td className="p-4 text-xs font-semibold text-emerald-600">
                          {item.newStatus || "-"}
                        </td>
                        <td className="p-4">{item.performedBy || "-"}</td>
                        <td className="p-4 text-xs text-slate-500">
                          {new Date(item.performedAt).toLocaleString()}
                        </td>
                        <td className="p-4 text-xs max-w-xs truncate">{item.remarks || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bundle Information Preview Modal */}
      <BundlePreviewModal
        open={Boolean(previewBundle)}
        onClose={() => setPreviewBundle(null)}
        bundleData={previewBundle}
      />

      {/* Receive Selection Modal */}
      <ReceiveSelectionModal
        open={Boolean(receiveSelectionBundle)}
        onClose={() => setReceiveSelectionBundle(null)}
        onConfirmReceive={handleConfirmReceiveSelection}
        bundleData={receiveSelectionBundle}
        isReceiving={isReceiving}
      />

      {/* Bundle Receive Modal */}
      {selectedBundle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Inbound Bundle Details ({formatBundleNumber(selectedBundle.bundleNumber)})
                </h3>
                <p className="text-xs text-slate-500">
                  From: {selectedBundle.fromOffice?.officeName || "Origin Office"}
                </p>
              </div>
              <button
                onClick={() => setSelectedBundle(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">
                  Bundle Items ({selectedBundle.items?.length || 0})
                </span>
                <span className="text-xs text-slate-500">
                  Selected for Receive: {bundleReceivedSelections.length} / {selectedBundle.items?.length || 0}
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-700">
                    <tr>
                      <th className="p-3 w-10 text-center">Receive</th>
                      <th className="p-3 text-center w-12">SL No.</th>
                      <th className="p-3">Tracking Number</th>
                      <th className="p-3">Registration Office</th>
                      <th className="p-3">Delivery At</th>
                      <th className="p-3">Collection Of</th>
                      <th className="p-3">Document Name</th>
                      <th className="p-3">Document Type</th>
                      <th className="p-3">Process Type</th>
                      <th className="p-3">Mobile Number</th>
                      <th className="p-3 text-center">Express Priority</th>
                      <th className="p-3 text-right">Total Amount</th>
                      <th className="p-3 text-right">Advance Amount</th>
                      <th className="p-3 text-right">Balance Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedBundle.items?.map((item: any, index: number) => {
                      const isChecked = bundleReceivedSelections.includes(item.trackingNumber);
                      const reg = item.registration;
                      const docName = reg?.documentName || reg?.customerName || "-";
                      const procType = reg?.processType || reg?.externalProcess || "-";
                      return (
                        <tr key={item.id} className={isChecked ? "bg-emerald-50/30" : ""}>
                          <td className="p-3">
                            <button
                              onClick={() => handleToggleReceiveItem(item.trackingNumber)}
                              className="text-slate-600"
                            >
                              {isChecked ? (
                                <CheckSquare className="h-5 w-5 text-emerald-600" />
                              ) : (
                                <Square className="h-5 w-5 text-slate-400" />
                              )}
                            </button>
                          </td>
                          <td className="p-3 font-semibold text-slate-500">{index + 1}</td>
                          <td className="p-3 font-mono font-bold text-blue-600">
                            {item.trackingNumber}
                          </td>
                          <td className="p-3 text-xs font-semibold text-slate-800">{reg?.regionOfRegistration || "-"}</td>
                          <td className="p-3 text-xs text-slate-600">{reg?.deliveryLocation || "-"}</td>
                          <td className="p-3 text-xs text-slate-700">{reg?.collectedPerson || "-"}</td>
                          <td className="p-3 font-medium text-slate-900">{docName}</td>
                          <td className="p-3 text-xs">{reg?.documentType || "-"}</td>
                          <td className="p-3 text-xs font-semibold text-slate-800">{procType}</td>
                          <td className="p-3 font-mono text-xs text-slate-600">{reg?.mobile || "-"}</td>
                          <td className="p-3 text-xs">
                            <PriorityBadge priority={reg?.priority} size="xs" />
                          </td>
                          <td className="p-3 text-xs font-bold text-slate-900">
                            {reg?.totalCharges ? `₹${Number(reg.totalCharges).toFixed(2)}` : "-"}
                          </td>
                          <td className="p-3 text-xs font-bold text-emerald-700">
                            {reg?.advancePaid !== undefined && reg?.advancePaid !== null ? `₹${Number(reg.advancePaid).toFixed(2)}` : "-"}
                          </td>
                          <td className="p-3 text-xs font-bold text-blue-700">
                            {reg?.balanceAmount !== undefined && reg?.balanceAmount !== null ? `₹${Number(reg.balanceAmount).toFixed(2)}` : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <Button variant="secondary" onClick={() => setSelectedBundle(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmReceive}
                disabled={bundleReceivedSelections.length === 0 || isReceiving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {bundleReceivedSelections.length > 0
                  ? `Confirm Receive (${bundleReceivedSelections.length})`
                  : "Confirm Receive"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* RETRIEVE CONFIRMATION MODAL */}
      <RetrieveConfirmationModal
        open={Boolean(retrieveBundle)}
        onClose={() => setRetrieveBundle(null)}
        itemTitle={formatBundleNumber(retrieveBundle?.bundleNumber)}
        documentCount={retrieveBundle?.items?.length}
        onConfirm={async (reason) => {
          if (!retrieveBundle) return;
          const res = await fetch("/api/document-movement/retrieve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bundleId: retrieveBundle.id,
              reason,
            }),
          });
          const json = await res.json();
          if (!res.ok) {
            alert(json.error || "Failed to retrieve bundle.");
            return;
          }
          alert(json.message || "Bundle retrieved successfully.");
          setRetrieveBundle(null);
          await fetchData();
        }}
      />
    </div>
  );
}
