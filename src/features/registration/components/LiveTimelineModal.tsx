"use client";

import { useEffect, useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { 
  X, 
  MapPin, 
  Clock, 
  ArrowRight, 
  User, 
  Truck, 
  FileText,
  AlertCircle
} from "lucide-react";
import { PriorityBadge } from "@/components/ui/PriorityBadge";

interface TimelineEvent {
  id: string;
  from: string;
  to: string;
  module: string;
  date: string; // ISO date
  status: string;
  transferredBy: string | null;
  receivedBy: string | null;
  courierNumber: string | null;
  remarks: string | null;
}

interface TimelineResponse {
  registration: {
    trackingNumber: string;
    customerName: string;
    service: string;
    status: string;
    priority?: string;
    updatedAt: string;
  };
  currentLocation: {
    officeName: string;
    status: string;
    receivedAt: string | null;
    handledBy: string | null;
    updatedAt: string;
  } | null;
  timeline: TimelineEvent[];
  error?: string;
}

interface LiveTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackingNumber: string;
}

function StatusBadge({ status }: { status: string }) {
  const getStyle = () => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-700 border-green-200";
      case "In Transit":
      case "Sent":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Pending Receive":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "Returned":
        return "bg-red-100 text-red-700 border-red-200";
      case "Cancelled":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStyle()}`}>
      {status}
    </span>
  );
}

export function LiveTimelineModal({ isOpen, onClose, trackingNumber }: LiveTimelineModalProps) {
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timer: NodeJS.Timeout;

    async function fetchData() {
      if (!isOpen || !trackingNumber) return;
      try {
        setIsLoading(true);
        const res = await fetch(`/api/document-movement/${trackingNumber}/timeline`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || json.error || "Failed to fetch timeline");
        if (mounted) {
          setData(json);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) setError(err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    if (isOpen) {
      fetchData();
      timer = setInterval(fetchData, 5000);
    }

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [isOpen, trackingNumber]);

  if (!isOpen) return null;

  return (
    <div className="relative z-50">
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="fixed inset-0 z-10 flex items-center justify-center p-4 sm:p-6">
        <div className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white z-20 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold leading-6 text-gray-900">
                  Live Document Movement
                </h3>
                <p className="mt-1 text-sm text-gray-500 flex items-center gap-2">
                  Tracking Number: <span className="font-medium text-gray-900">{trackingNumber}</span>
                  <PriorityBadge priority={data?.registration?.priority} />
                </p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-full bg-white p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-50 focus:outline-none shrink-0"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50/50 px-6 py-6">
            {isLoading && !data && (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 p-4 mb-6">
                <div className="flex">
                  <div className="shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error loading timeline</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error.message || "An unexpected error occurred."}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {data && data.registration && (
              <div className="space-y-8">
                {/* Current Location Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-linear-to-r from-primary/5 to-transparent px-6 py-4 border-b border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      CURRENT LOCATION
                    </h4>
                  </div>
                  <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Office Name</p>
                      <p className="mt-1 text-base font-bold text-gray-900">{data.currentLocation?.officeName || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Current Status</p>
                      <div className="mt-1">
                        <StatusBadge status={data.currentLocation?.status || data.registration.status} />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Last Updated</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {data.currentLocation?.updatedAt ? format(new Date(data.currentLocation.updatedAt), "dd MMM yyyy, p") : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Current Responsible</p>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {data.currentLocation?.handledBy || "System"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-500" /> Movement Journey
                  </h4>
                  
                  {data.timeline.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                      <Clock className="mx-auto h-8 w-8 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No movements yet</h3>
                      <p className="mt-1 text-sm text-gray-500">This document hasn't been transferred to any other branch.</p>
                    </div>
                  ) : (
                    <div className="relative pb-10">
                      {/* Vertical Line */}
                      <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-gray-200" aria-hidden="true" />
                      
                      <ul role="list" className="space-y-8">
                        {data.timeline.map((movement) => (
                          <li key={movement.id} className="relative pl-20">
                            {/* Timeline Node */}
                            <div className="absolute left-8 top-6 ml-[-5px] h-3 w-3 rounded-full border-2 border-white bg-primary shadow-sm ring-4 ring-white z-10" />
                            
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative">
                              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4 bg-gray-50/50 rounded-t-xl">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2 text-base font-bold text-gray-900 uppercase">
                                    <span>{movement.from}</span>
                                    <ArrowRight className="w-5 h-5 text-primary" />
                                    <span>{movement.to}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-semibold text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded-md">
                                    {movement.module}
                                  </span>
                                  <StatusBadge status={movement.status} />
                                </div>
                              </div>
                              
                              <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                  <div className="flex items-start gap-3">
                                    <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                    <div>
                                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</p>
                                      <p className="text-sm text-gray-900 mt-0.5 font-medium">
                                        {format(new Date(movement.date), "dd MMM yyyy, p")}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-start gap-3">
                                    <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                    <div>
                                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Transferred By</p>
                                      <p className="text-sm text-gray-900 mt-0.5">
                                        {movement.transferredBy || "-"}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <div className="flex items-start gap-3">
                                    <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                    <div>
                                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Received By</p>
                                      <p className="text-sm text-gray-900 mt-0.5">
                                        {movement.receivedBy || "-"}
                                      </p>
                                    </div>
                                  </div>

                                  {(movement.courierNumber || movement.remarks) && (
                                    <div className="flex items-start gap-3">
                                      <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                      <div>
                                        {movement.courierNumber && (
                                          <div className="mb-2">
                                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Courier</p>
                                            <p className="text-sm font-medium text-blue-600 mt-0.5">
                                              <Truck className="w-3 h-3 inline mr-1" />
                                              {movement.courierNumber}
                                            </p>
                                          </div>
                                        )}
                                        {movement.remarks && (
                                          <div>
                                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</p>
                                            <p className="text-sm text-gray-600 mt-0.5 italic">{movement.remarks}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
