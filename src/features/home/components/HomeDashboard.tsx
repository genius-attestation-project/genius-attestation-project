"use client";

import { useEffect, useState, useMemo } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

type HomeDashboardProps = {
  currentOfficeLocationName: string;
};

type OfficeOption = {
  id: string;
  officeName: string;
};

type TabKey = "document_in_hand" | "inbound" | "outbound" | "history";

export function HomeDashboard({ currentOfficeLocationName }: HomeDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("document_in_hand");
  const [offices, setOffices] = useState<OfficeOption[]>([]);
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

  // Popup Modal state for Inbound Bundle Details
  const [selectedBundle, setSelectedBundle] = useState<any | null>(null);
  const [bundleReceivedSelections, setBundleReceivedSelections] = useState<string[]>([]);
  const [isReceiving, setIsReceiving] = useState(false);

  // Fetch offices
  useEffect(() => {
    async function loadOffices() {
      try {
        const res = await fetch("/api/offices/all");
        if (res.ok) {
          const body = await res.json();
          const list = body.offices || body.data || [];
          setOffices(list);
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

  // Checkbox helpers for Document In Hand
  const handleSelectAllInHand = () => {
    if (selectedTrackingNumbers.length === inHandDocs.length) {
      setSelectedTrackingNumbers([]);
    } else {
      setSelectedTrackingNumbers(inHandDocs.map((doc) => doc.trackingNumber));
    }
  };

  const handleToggleSelectInHand = (trackingNumber: string) => {
    setSelectedTrackingNumbers((prev) =>
      prev.includes(trackingNumber)
        ? prev.filter((t) => t !== trackingNumber)
        : [...prev, trackingNumber]
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
    setBundleReceivedSelections(bundle.items.map((i: any) => i.trackingNumber));
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
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Select Destination Office:
                </span>
                <select
                  value={destinationOfficeId}
                  onChange={(e) => setDestinationOfficeId(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-xs focus:border-blue-500"
                >
                  <option value="">Select Office</option>
                  {offices
                    .filter((o) => o.id !== selectedOfficeId)
                    .map((off) => (
                      <option key={off.id} value={off.id}>
                        {off.officeName}
                      </option>
                    ))}
                </select>

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

            {/* Document Table */}
            {inHandDocs.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No Documents In Hand"
                description="Newly registered or received documents for this office will appear here."
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                    <tr>
                      <th className="p-4 w-10">
                        <button onClick={handleSelectAllInHand} className="text-slate-600">
                          {selectedTrackingNumbers.length === inHandDocs.length ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-slate-400" />
                          )}
                        </button>
                      </th>
                      <th className="p-4">Tracking Number</th>
                      <th className="p-4">Customer Name</th>
                      <th className="p-4">Document Type</th>
                      <th className="p-4">Process / Package</th>
                      <th className="p-4">Current Office</th>
                      <th className="p-4">Registered Date</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {inHandDocs.map((doc) => {
                      const isSelected = selectedTrackingNumbers.includes(doc.trackingNumber);
                      return (
                        <tr key={doc.id} className={isSelected ? "bg-blue-50/50" : "hover:bg-slate-50"}>
                          <td className="p-4">
                            <button
                              onClick={() => handleToggleSelectInHand(doc.trackingNumber)}
                              className="text-slate-600"
                            >
                              {isSelected ? (
                                <CheckSquare className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Square className="h-5 w-5 text-slate-400" />
                              )}
                            </button>
                          </td>
                          <td className="p-4 font-bold text-blue-600">{doc.trackingNumber}</td>
                          <td className="p-4 font-medium text-slate-900">{doc.customerName}</td>
                          <td className="p-4">{doc.documentType || "-"}</td>
                          <td className="p-4">{doc.processType || "-"}</td>
                          <td className="p-4 font-medium">{doc.regionOfRegistration || "Main"}</td>
                          <td className="p-4 text-xs text-slate-500">
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                              {doc.trackingStatus || "In Hand"}
                            </span>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inboundBundles.map((bundle) => (
                  <div
                    key={bundle.id}
                    onClick={() => handleOpenBundleModal(bundle)}
                    className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-blue-400 transition-all"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <span className="font-mono text-base font-bold text-blue-600">
                        {bundle.bundleNumber}
                      </span>
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        {bundle.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">From Office:</span>
                        <span className="font-semibold text-slate-800">
                          {bundle.fromOffice?.officeName || "Origin Office"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Documents:</span>
                        <span className="font-bold text-slate-900">{bundle.items?.length || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Transferred On:</span>
                        <span>{new Date(bundle.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                      <span className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                        View & Receive Details →
                      </span>
                    </div>
                  </div>
                ))}
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
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                    <tr>
                      <th className="p-4">Bundle Number</th>
                      <th className="p-4">Destination Office</th>
                      <th className="p-4">Document Count</th>
                      <th className="p-4">Transferred By</th>
                      <th className="p-4">Transferred Date</th>
                      <th className="p-4">Received Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {outboundBundles.map((bundle) => (
                      <tr key={bundle.id} className="hover:bg-slate-50">
                        <td className="p-4 font-mono font-bold text-blue-600">
                          {bundle.bundleNumber}
                        </td>
                        <td className="p-4 font-semibold text-slate-800">
                          {bundle.toOffice?.officeName || "Destination"}
                        </td>
                        <td className="p-4 font-bold text-slate-900">{bundle.items?.length || 0}</td>
                        <td className="p-4">{bundle.createdBy || "User"}</td>
                        <td className="p-4 text-xs text-slate-500">
                          {new Date(bundle.createdAt).toLocaleString()}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              bundle.status === "Received"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {bundle.status}
                          </span>
                        </td>
                      </tr>
                    ))}
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
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 tracking-wider">
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
                        <td className="p-4 font-bold text-blue-600">{item.trackingNumber}</td>
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

      {/* Bundle Receive Modal */}
      {selectedBundle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Inbound Bundle Details ({selectedBundle.bundleNumber})
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
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="p-3 w-10">Receive</th>
                      <th className="p-3">Tracking Number</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedBundle.items?.map((item: any) => {
                      const isChecked = bundleReceivedSelections.includes(item.trackingNumber);
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
                          <td className="p-3 font-bold text-slate-900">{item.trackingNumber}</td>
                          <td className="p-3">
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                              {item.status}
                            </span>
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
                Confirm Receive ({bundleReceivedSelections.length})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
