"use client";

import React, { useState, useCallback } from "react";
import { StatementFilters } from "./StatementFilters";
import { EmptyState } from "./EmptyState";
import { DebitSection } from "./DebitSection";
import { CreditSection } from "./CreditSection";
import { TransactionProofViewer } from "./TransactionProofViewer";
import { EditTransactionModal } from "./EditTransactionModal";
import type { AccountStatementsData, AccountStatementItem } from "../types/account-statements.types";
import { AlertCircle } from "lucide-react";

export const AccountStatementsPage: React.FC = () => {
  const [office, setOffice] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);

  const [data, setData] = useState<AccountStatementsData>({
    office: "",
    fromDate: "",
    toDate: "",
    openingBalance: 0,
    credit: {
      advances: [],
      advancesTotal: 0,
      moreAdvances: [],
      moreAdvancesTotal: 0,
      panelCredits: [],
      panelCreditsTotal: 0,
      creditTotal: 0,
    },
    debit: {
      groups: [],
      debitTotal: 0,
    },
    cashInHand: 0,
  });

  // Modal States
  const [viewingProofItem, setViewingProofItem] = useState<AccountStatementItem | null>(null);
  const [editingItem, setEditingItem] = useState<AccountStatementItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<AccountStatementItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStatements = useCallback(async () => {
    // Validate mandatory parameters
    if (!office || office === "All" || !fromDate || !toDate) {
      setValidationWarning("Please select an Office, From Date, and To Date before searching.");
      return;
    }

    setValidationWarning(null);
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("office", office);
      params.set("fromDate", fromDate);
      params.set("toDate", toDate);
      if (search) params.set("search", search);

      const res = await fetch(`/api/account-statements?${params.toString()}`, {
        cache: "no-store",
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to fetch account statements.");
      }

      setData(json);
      setHasSearched(true);
    } catch (err: any) {
      console.error("Failed to fetch statements:", err);
      setError(err?.message || "Failed to fetch account statements.");
    } finally {
      setLoading(false);
    }
  }, [office, fromDate, toDate, search]);

  const handleResetFilters = () => {
    setOffice("");
    setFromDate("");
    setToDate("");
    setSearch("");
    setHasSearched(false);
    setValidationWarning(null);
    setError(null);
    setData({
      office: "",
      fromDate: "",
      toDate: "",
      openingBalance: 0,
      credit: {
        advances: [],
        advancesTotal: 0,
        moreAdvances: [],
        moreAdvancesTotal: 0,
        panelCredits: [],
        panelCreditsTotal: 0,
        creditTotal: 0,
      },
      debit: {
        groups: [],
        debitTotal: 0,
      },
      cashInHand: 0,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/account-statements/${deletingItem.id}?sourceType=${deletingItem.sourceType}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete transaction.");
      }
      setDeletingItem(null);
      fetchStatements();
    } catch (err: any) {
      alert(err?.message || "Failed to delete transaction.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto print:p-0 print:max-w-none">
      {/* Filters Header */}
      <div className="print:hidden">
        <StatementFilters
          office={office}
          fromDate={fromDate}
          toDate={toDate}
          search={search}
          hasSearched={hasSearched}
          onOfficeChange={(val) => {
            setOffice(val);
            if (validationWarning) setValidationWarning(null);
          }}
          onFromDateChange={(val) => {
            setFromDate(val);
            if (validationWarning) setValidationWarning(null);
          }}
          onToDateChange={(val) => {
            setToDate(val);
            if (validationWarning) setValidationWarning(null);
          }}
          onSearchChange={setSearch}
          onApplyFilters={fetchStatements}
          onResetFilters={handleResetFilters}
          onPrint={handlePrint}
          loading={loading}
        />
      </div>

      {/* Mandatory Validation Warning */}
      {validationWarning && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/60 dark:text-amber-300 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>{validationWarning}</span>
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-600 dark:bg-red-950/60 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Main View Area: Initial Empty State vs Dual Column Statement Tables */}
      {!hasSearched ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
          {/* Left Column: Debit Side */}
          <DebitSection
            groups={data.debit.groups}
            debitTotal={data.debit.debitTotal}
            onViewProof={(item) => setViewingProofItem(item)}
            onEdit={(item) => setEditingItem(item)}
            onDelete={(item) => setDeletingItem(item)}
          />

          {/* Right Column: Credit Side */}
          <CreditSection
            creditData={data.credit}
            openingBalance={data.openingBalance}
            cashInHand={data.cashInHand}
            onViewProof={(item) => setViewingProofItem(item)}
            onEdit={(item) => setEditingItem(item)}
            onDelete={(item) => setDeletingItem(item)}
          />
        </div>
      )}

      {/* Proof Viewer Modal */}
      <TransactionProofViewer
        isOpen={Boolean(viewingProofItem)}
        proofUrl={viewingProofItem?.proofFileUrl || null}
        proofTitle={viewingProofItem?.proofFileName || "Payment Proof Document"}
        onClose={() => setViewingProofItem(null)}
      />

      {/* Edit Modal */}
      <EditTransactionModal
        isOpen={Boolean(editingItem)}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSuccess={fetchStatements}
      />

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Confirm Delete Transaction
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Are you sure you want to delete this transaction record?
              <br />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Invoice / Tracking: {deletingItem.invoiceNumber} (₹{deletingItem.amount.toLocaleString("en-IN")})
              </span>
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
                className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-white/10 dark:text-white cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="rounded-2xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-500/20 hover:bg-rose-700 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Transaction"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
