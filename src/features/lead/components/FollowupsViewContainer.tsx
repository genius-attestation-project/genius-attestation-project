"use client";

import { useState } from "react";
import { FollowupsCalendarManagement } from "./FollowupsCalendarManagement";
import { FollowupsReportManagement } from "./FollowupsReportManagement";
import { List, Calendar as CalendarIcon } from "lucide-react";

export function FollowupsViewContainer() {
  const [view, setView] = useState<"calendar" | "report">("calendar");

  return (
    <div className="grid gap-6">
      <div className="flex w-full items-center justify-end">
        <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
          <button
            onClick={() => setView("calendar")}
            className={`flex items-center px-4 py-2 text-sm font-semibold transition ${
              view === "calendar" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <CalendarIcon size={16} className="mr-2" />
            Calendar View
          </button>
          <button
            onClick={() => setView("report")}
            className={`flex items-center border-l border-slate-300 px-4 py-2 text-sm font-semibold transition ${
              view === "report" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <List size={16} className="mr-2" />
            Report & Export
          </button>
        </div>
      </div>
      {view === "calendar" ? <FollowupsCalendarManagement /> : <FollowupsReportManagement />}
    </div>
  );
}
