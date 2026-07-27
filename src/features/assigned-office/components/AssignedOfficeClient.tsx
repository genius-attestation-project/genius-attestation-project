"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  LogIn,
  Inbox,
  PackageCheck,
  CheckCircle2,
  RotateCcw,
  XCircle,
  Clock,
  Send,
  Layers,
  Search,
  CheckSquare,
  Square,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

type TabKey = "inbound" | "in_hand" | "complete" | "return" | "rejected" | "history";

type AssignedOfficeClientProps = {
  initialOfficeLocations?: Array<{ id: string; officeName: string }>;
  permissions?: Record<string, boolean>;
};

export function AssignedOfficeClient({ initialOfficeLocations = [], permissions }: AssignedOfficeClientProps) {
  const [offices, setOffices] = useState<Array<{ id: string; officeName: string }>>(
    initialOfficeLocations
  );
  const [selectedLoginOfficeId, setSelectedLoginOfficeId] = useState<string>("");
  const [currentOffice, setCurrentOffice] = useState<{ id: string; officeName: string } | null>(
    null
  );

  const [activeTab, setActiveTab] = useState<TabKey>("in_hand");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Data states
  const [stats, setStats] = useState<any>({
    pendingCount: 0,
    inboundCount: 0,
    completedCount: 0,
    returnedCount: 0,
    rejectedCount: 0,
  });
  const [documents, setDocuments] = useState<any[]>([]);

  // Selection states
  const [selectedTrackingNumbers, setSelectedTrackingNumbers] = useState<string[]>([]);

  // Modals
  const [showSubPackageModal, setShowSubPackageModal] = useState(false);
  const [subPackageAssignments, setSubPackageAssignments] = useState<
    Record<string, string>
  >({});
  const [subPackageOptions, setSubPackageOptions] = useState<any[]>([]);

  // Inbound Bundle Receive Modal
  const [selectedInboundBundle, setSelectedInboundBundle] = useState<any | null>(null);
  const [bundleReceivedSelections, setBundleReceivedSelections] = useState<string[]>([]);
  const [isReceiving, setIsReceiving] = useState(false);

  // Reject transfer destination office
  const [rejectDestinationOfficeId, setRejectDestinationOfficeId] = useState<string>("");

  // Load offices on mount
  useEffect(() => {
    async function loadOffices() {
      try {
        const res = await fetch("/api/admin-management/office-locations");
        if (res.ok) {
          const body = await res.json();
          const list = body.data || body.officeLocations || [];
          setOffices(list);
          if (list.length > 0) {
            setSelectedLoginOfficeId(list[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load assigned offices", err);
      }
    }
    loadOffices();
  }, []);

  // Load sub package options from master config
  useEffect(() => {
    async function loadSubPackages() {
      try {
        const res = await fetch("/api/master-data/SUB_PACKAGE");
        if (res.ok) {
          const body = await res.json();
          setSubPackageOptions(body.data || body.items || []);
        }
      } catch (err) {
        console.error("Failed to load subpackage options", err);
      }
    }
    loadSubPackages();
  }, []);

  const handleLogin = () => {
    const found = offices.find((o) => o.id === selectedLoginOfficeId);
    if (found) {
      setCurrentOffice(found);
      setActiveTab("in_hand");
    }
  };

  const fetchOfficeData = async () => {
    if (!currentOffice) return;
    setIsLoading(true);
    try {
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : "";
      const res = await fetch(
        `/api/assigned-office/documents?officeId=${currentOffice.id}&tab=${activeTab}${searchParam}`
      );
      if (res.ok) {
        const body = await res.json();
        if (body.stats) setStats(body.stats);
        setDocuments(body.documents || []);
      }
    } catch (err) {
      console.error("Failed to fetch assigned office documents", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficeData();
    setSelectedTrackingNumbers([]);
  }, [currentOffice, activeTab, searchQuery]);

  // Checkbox handlers
  const handleSelectAll = () => {
    if (selectedTrackingNumbers.length === documents.length) {
      setSelectedTrackingNumbers([]);
    } else {
      setSelectedTrackingNumbers(documents.map((d) => d.trackingNumber));
    }
  };

  const handleToggleSelect = (trackingNumber: string) => {
    setSelectedTrackingNumbers((prev) =>
      prev.includes(trackingNumber)
        ? prev.filter((t) => t !== trackingNumber)
        : [...prev, trackingNumber]
    );
  };

  // Open SubPackage Transfer Modal
  const handleOpenSubPackageModal = () => {
    if (selectedTrackingNumbers.length === 0) {
      alert("Please select at least one document to transfer to a Sub Package.");
      return;
    }
    const initialMapping: Record<string, string> = {};
    selectedTrackingNumbers.forEach((tn) => {
      initialMapping[tn] = subPackageOptions[0]?.id || subPackageOptions[0]?.name || "";
    });
    setSubPackageAssignments(initialMapping);
    setShowSubPackageModal(true);
  };

  // Confirm SubPackage Transfer
  const handleConfirmSubPackageTransfer = async () => {
    if (!currentOffice) return;
    const items = Object.entries(subPackageAssignments).map(([trackingNumber, subPackageId]) => ({
      trackingNumber,
      subPackageId,
    }));

    try {
      setIsLoading(true);
      const res = await fetch("/api/assigned-office/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transfer_to_subpackage",
          items,
          officeId: currentOffice.id,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Sub package transfer failed");

      alert(`Transferred ${items.length} documents to sub packages successfully!`);
      setShowSubPackageModal(false);
      setSelectedTrackingNumbers([]);
      fetchOfficeData();
    } catch (err: any) {
      alert(err.message || "Transfer error");
    } finally {
      setIsLoading(false);
    }
  };

  // Back To Process Action
  const handleBackToProcess = async () => {
    if (selectedTrackingNumbers.length === 0) {
      alert("Please select documents to send back to Process.");
      return;
    }
    const processOffice = offices.find((o) => o.id !== currentOffice?.id);
    if (!processOffice) {
      alert("No process office destination available.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/assigned-office/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "back_to_process",
          trackingNumbers: selectedTrackingNumbers,
          fromOfficeId: currentOffice?.id,
          toOfficeId: processOffice.id,
          remarks: "Sent Back To Process Module",
        }),
      });

      if (res.ok) {
        alert("Sent back to Process Inbound!");
        setSelectedTrackingNumbers([]);
        fetchOfficeData();
      }
    } catch (err) {
      alert("Failed to send back to Process");
    } finally {
      setIsLoading(false);
    }
  };

  // Inbound Bundle Receive
  const handleOpenInboundModal = (bundle: any) => {
    setSelectedInboundBundle(bundle);
    setBundleReceivedSelections(bundle.items.map((i: any) => i.trackingNumber));
  };

  const handleConfirmInboundReceive = async () => {
    if (!selectedInboundBundle) return;
    try {
      setIsReceiving(true);
      const res = await fetch("/api/bm-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "receive",
          bundleId: selectedInboundBundle.id,
          receivedTrackingNumbers: bundleReceivedSelections,
        }),
      });
      const body = await res.json();
      if (res.ok) {
        alert(`Bundle received successfully!`);
        setSelectedInboundBundle(null);
        fetchOfficeData();
      }
    } catch (err) {
      alert("Receive error");
    } finally {
      setIsReceiving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. ASSIGNED OFFICE LOGIN BAR */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Building2 className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">Assigned Office Login</h2>
            <p className="text-xs text-slate-500">
              Select your assigned office to enter the office processing workflow
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedLoginOfficeId}
            onChange={(e) => setSelectedLoginOfficeId(e.target.value)}
            className="w-full sm:w-64 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
          >
            {offices.map((off) => (
              <option key={off.id} value={off.id}>
                {off.officeName}
              </option>
            ))}
          </select>

          <Button
            onClick={handleLogin}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-5 py-2 text-sm shadow-sm"
          >
            <LogIn className="mr-2 h-4 w-4" />
            LOGIN
          </Button>
        </div>
      </div>

      {/* 2. DASHBOARD VIEW (WHEN LOGGED IN) */}
      {currentOffice ? (
        <div className="space-y-6">
          {/* Active Office Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 p-6 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                ACTIVE ASSIGNED OFFICE
              </span>
              <h1 className="text-2xl font-black tracking-tight">{currentOffice.officeName}</h1>
            </div>

            <Link
              href="/dashboard/assigned-office/sub-packages"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-5 py-2.5 text-sm font-bold text-white border border-white/20 backdrop-blur-xs transition-all"
            >
              <Layers className="h-4 w-4 text-blue-300" />
              VIEW SUB PACKAGES →
            </Link>
          </div>

          {/* KPI Header Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-xs">
              <span className="text-2xl font-black text-slate-900">{stats.pendingCount}</span>
              <p className="text-xs font-semibold text-slate-500 mt-1">Pending Documents</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-xs">
              <span className="text-2xl font-black text-blue-600">{stats.inboundCount}</span>
              <p className="text-xs font-semibold text-slate-500 mt-1">Inbound Bundles</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-xs">
              <span className="text-2xl font-black text-emerald-600">{stats.completedCount}</span>
              <p className="text-xs font-semibold text-slate-500 mt-1">Completed</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-xs">
              <span className="text-2xl font-black text-amber-600">{stats.returnedCount}</span>
              <p className="text-xs font-semibold text-slate-500 mt-1">Returned</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-xs">
              <span className="text-2xl font-black text-rose-600">{stats.rejectedCount}</span>
              <p className="text-xs font-semibold text-slate-500 mt-1">Rejected</p>
            </div>
          </div>

          {/* Tabs Bar */}
          <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-100/80 p-1.5 rounded-2xl gap-1">
            <button
              onClick={() => setActiveTab("inbound")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === "inbound"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Inbox className="h-4 w-4" />
              Inbound
            </button>
            <button
              onClick={() => setActiveTab("in_hand")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === "in_hand"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <PackageCheck className="h-4 w-4" />
              Document In Hand
            </button>
            <button
              onClick={() => setActiveTab("complete")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === "complete"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Document Complete
            </button>
            <button
              onClick={() => setActiveTab("return")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === "return"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <RotateCcw className="h-4 w-4 text-amber-600" />
              Document Return
            </button>
            <button
              onClick={() => setActiveTab("rejected")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === "rejected"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <XCircle className="h-4 w-4 text-rose-600" />
              Rejected
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === "history"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className="h-4 w-4" />
              History
            </button>
          </div>

          {/* Main Tab Content */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search tracking number or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-300 pl-9 pr-4 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* TAB: INBOUND BUNDLES */}
            {activeTab === "inbound" && (
              <div>
                {documents.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    title="No Inbound Bundles"
                    description="No inbound bundles waiting to be received."
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {documents.map((bundle) => (
                      <div
                        key={bundle.id}
                        onClick={() => handleOpenInboundModal(bundle)}
                        className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-blue-400 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                          <span className="font-mono text-base font-bold text-blue-600">
                            {bundle.bundleNumber}
                          </span>
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            {bundle.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          From: {bundle.fromOffice?.officeName} • {bundle.items?.length || 0} Documents
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: DOCUMENT IN HAND */}
            {activeTab === "in_hand" && (
              <div className="space-y-6">
                {/* Action Controls Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <span className="text-sm font-semibold text-slate-700">
                    Selected: {selectedTrackingNumbers.length} documents
                  </span>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={handleBackToProcess}
                      disabled={selectedTrackingNumbers.length === 0}
                      className="bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-xl px-4 py-2 text-sm"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Back To Process
                    </Button>

                    <Button
                      onClick={handleOpenSubPackageModal}
                      disabled={selectedTrackingNumbers.length === 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-4 py-2 text-sm"
                    >
                      <Layers className="mr-2 h-4 w-4" />
                      Transfer To Sub Package
                    </Button>

                    <Link
                      href="/dashboard/assigned-office/sub-packages"
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 text-sm"
                    >
                      View Sub Packages →
                    </Link>
                  </div>
                </div>

                {documents.length === 0 ? (
                  <EmptyState
                    icon={PackageCheck}
                    title="No Documents In Hand"
                    description="Documents received at this office will appear here."
                  />
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm text-slate-700">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                        <tr>
                          <th className="p-4 w-10">
                            <button onClick={handleSelectAll}>
                              {selectedTrackingNumbers.length === documents.length ? (
                                <CheckSquare className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Square className="h-5 w-5 text-slate-400" />
                              )}
                            </button>
                          </th>
                          <th className="p-4">Tracking Number</th>
                          <th className="p-4">Customer</th>
                          <th className="p-4">Document Type</th>
                          <th className="p-4">Process Type</th>
                          <th className="p-4">Received Date</th>
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {documents.map((doc) => {
                          const isSelected = selectedTrackingNumbers.includes(doc.trackingNumber);
                          return (
                            <tr key={doc.id} className={isSelected ? "bg-blue-50/50" : "hover:bg-slate-50"}>
                              <td className="p-4">
                                <button onClick={() => handleToggleSelect(doc.trackingNumber)}>
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
                              <td className="p-4 text-xs text-slate-500">
                                {new Date(doc.createdAt).toLocaleDateString()}
                              </td>
                              <td className="p-4">
                                <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
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

            {/* TAB: DOCUMENT COMPLETE */}
            {activeTab === "complete" && (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="p-4">Tracking Number</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Document Type</th>
                      <th className="p-4">Process Type</th>
                      <th className="p-4">Completion Date</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50">
                        <td className="p-4 font-bold text-blue-600">{doc.trackingNumber}</td>
                        <td className="p-4 font-medium text-slate-900">{doc.customerName}</td>
                        <td className="p-4">{doc.documentType || "-"}</td>
                        <td className="p-4">{doc.processType || "-"}</td>
                        <td className="p-4 text-xs text-slate-500">
                          {new Date(doc.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                            Completed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB: DOCUMENT RETURN */}
            {activeTab === "return" && (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="p-4">Tracking Number</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Document Type</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Returned On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50">
                        <td className="p-4 font-bold text-blue-600">{doc.trackingNumber}</td>
                        <td className="p-4 font-medium text-slate-900">{doc.customerName}</td>
                        <td className="p-4">{doc.documentType || "-"}</td>
                        <td className="p-4 text-amber-700 font-semibold">Returned</td>
                        <td className="p-4 text-xs text-slate-500">
                          {new Date(doc.updatedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB: REJECTED */}
            {activeTab === "rejected" && (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="p-4">Tracking Number</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Document Type</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Rejected On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50">
                        <td className="p-4 font-bold text-blue-600">{doc.trackingNumber}</td>
                        <td className="p-4 font-medium text-slate-900">{doc.customerName}</td>
                        <td className="p-4">{doc.documentType || "-"}</td>
                        <td className="p-4 text-rose-700 font-semibold">Rejected</td>
                        <td className="p-4 text-xs text-slate-500">
                          {new Date(doc.updatedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-slate-400 mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Please Select an Assigned Office</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Use the Assigned Office dropdown above and click LOGIN to access office document processing.
          </p>
        </div>
      )}

      {/* MODAL: Transfer to Sub Package */}
      {showSubPackageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl space-y-6">
            <h3 className="text-xl font-bold text-slate-900">Transfer To Sub Package</h3>
            <p className="text-xs text-slate-500">
              Select a subpackage for each tracking number.
            </p>

            <div className="max-h-60 overflow-y-auto space-y-3">
              {selectedTrackingNumbers.map((tn) => (
                <div key={tn} className="flex items-center justify-between p-3 rounded-xl border bg-slate-50">
                  <span className="font-bold text-blue-600 font-mono">{tn}</span>
                  <select
                    value={subPackageAssignments[tn] || ""}
                    onChange={(e) =>
                      setSubPackageAssignments({ ...subPackageAssignments, [tn]: e.target.value })
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                  >
                    {subPackageOptions.map((sp) => (
                      <option key={sp.id || sp.name} value={sp.id || sp.name}>
                        {sp.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setShowSubPackageModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSubPackageTransfer}
                className="bg-blue-600 text-white font-semibold"
              >
                Transfer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Inbound Receive Modal */}
      {selectedInboundBundle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-6">
            <h3 className="text-xl font-bold text-slate-900">
              Receive Bundle: {selectedInboundBundle.bundleNumber}
            </h3>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {selectedInboundBundle.items?.map((item: any) => (
                <div key={item.id} className="p-3 border rounded-xl font-mono text-sm font-bold">
                  {item.trackingNumber}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setSelectedInboundBundle(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmInboundReceive}
                className="bg-emerald-600 text-white font-semibold"
              >
                Receive All
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
