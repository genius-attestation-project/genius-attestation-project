"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { GlobalReportFilters } from "../types/report.types";

interface ReportFilterContextType {
  filters: GlobalReportFilters;
  updateFilters: (newFilters: Partial<GlobalReportFilters>) => void;
  resetFilters: () => void;
}

const defaultFilters: GlobalReportFilters = {
  fromDate: "",
  toDate: "",
};

const ReportFilterContext = createContext<ReportFilterContextType | undefined>(undefined);

export const ReportFilterProvider = ({ children }: { children: ReactNode }) => {
  const [filters, setFilters] = useState<GlobalReportFilters>(defaultFilters);

  const updateFilters = (newFilters: Partial<GlobalReportFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  return (
    <ReportFilterContext.Provider value={{ filters, updateFilters, resetFilters }}>
      {children}
    </ReportFilterContext.Provider>
  );
};

export const useReportFilters = () => {
  const context = useContext(ReportFilterContext);
  if (!context) {
    throw new Error("useReportFilters must be used within a ReportFilterProvider");
  }
  return context;
};
