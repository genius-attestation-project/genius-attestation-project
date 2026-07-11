"use client";

import { useEffect, useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { 
  X, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  User, 
  Truck, 
  FileText,
  AlertCircle
} from "lucide-react";

interface MovementRecord {
  id: string;
  trackingNumber: string;
  sourceOffice: string | null;
  destinationOffice: string | null;
  transferredBy: string | null;
  receivedBy: string | null;
  transferDateTime: string;
  receiveDateTime: string | null;
  movementStatus: string;
  courierNumber: string | null;
  remarks: string | null;
  createdAt: string;
}

interface TimelineResponse {
  registration: {
    trackingNumber: string;
    customerName: string;
    service: string;
    status: string;
    updatedAt: string;
  };
  currentLocation: {
    officeId: string;
    status: string;
    receivedAt: string | null;
    handledBy: string | null;
    updatedAt: string;
  } | null;
  timeline: MovementRecord[];
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

      <div className="fixed inset-0 z-10 overflow-y-auto pointer-events-none">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0 pointer-events-auto">
          <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all sm:my-8 w-full max-w-4xl max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold leading-6 text-gray-900">
                    Live Branch Movement Timeline
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Tracking Number: <span className="font-medium text-gray-900">{trackingNumber}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-full bg-white p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-50 focus:outline-none"
                onClick={onClose}
              >
                <span className="sr-only">Close</span>
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6 overflow-y-auto flex-1 bg-gray-50/50">
              {isLoading && !data && (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}

              {error && (
                <div className="rounded-md bg-red-50 p-4">
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
                        Current Status
                      </h4>
                    </div>
                    <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Client Name</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">{data.registration.customerName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Service</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">{data.registration.service}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Current Office</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {data.timeline.length > 0 ? (
                            data.timeline[0].movementStatus === "Completed" 
                              ? data.timeline[0].destinationOffice 
                              : data.timeline[0].sourceOffice
                          ) : "Registration Office"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Current Holder</p>
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
                    <h4 className="text-lg font-semibold text-gray-900 mb-6">Movement History</h4>
                    
                    {data.timeline.length === 0 ? (
                      <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                        <Clock className="mx-auto h-8 w-8 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No movements yet</h3>
                        <p className="mt-1 text-sm text-gray-500">This document hasn't been transferred to any other branch.</p>
                      </div>
                    ) : (
                      <div className="relative pb-10">
                        {/* Vertical Line */}
                        <div className="absolute left-8 top-4 bottom-4 w-px bg-gray-200" aria-hidden="true" />
                        
                        <ul role="list" className="space-y-8">
                          {data.timeline.map((movement, idx) => (
                            <li key={movement.id} className="relative pl-20">
                              {/* Timeline Node */}
                              <div className="absolute left-6 top-5 -ml-px h-full w-px bg-gray-200" aria-hidden="true" />
                              <div className="absolute left-6 top-5 ml-[-9px] h-4 w-4 rounded-full border-2 border-white bg-primary shadow-sm flex items-center justify-center ring-4 ring-white" />
                              
                              <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 font-medium text-gray-900">
                                      <span>{movement.sourceOffice || "Unknown"}</span>
                                      <ArrowRight className="w-4 h-4 text-gray-400" />
                                      <span>{movement.destinationOffice || "Unknown"}</span>
                                    </div>
                                  </div>
                                  <StatusBadge status={movement.movementStatus} />
                                </div>
                                
                                <div className="px-5 py-4 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-gray-50/30">
                                  {/* Dispatch Details */}
                                  <div className="space-y-3 relative">
                                    <div className="flex items-start gap-3">
                                      <div className="mt-0.5"><Clock className="w-4 h-4 text-gray-400" /></div>
                                      <div>
                                        <p className="text-xs text-gray-500 font-medium">Dispatched</p>
                                        <p className="text-sm text-gray-900 mt-0.5">
                                          {format(new Date(movement.transferDateTime), "MMM d, yyyy 'at' h:mm a")}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                      <div className="mt-0.5"><User className="w-4 h-4 text-gray-400" /></div>
                                      <div>
                                        <p className="text-xs text-gray-500 font-medium">Transferred By</p>
                                        <p className="text-sm text-gray-900 mt-0.5">{movement.transferredBy || "System"}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Receive Details */}
                                  <div className="space-y-3 relative lg:pl-6 lg:border-l lg:border-gray-100">
                                    {movement.receiveDateTime ? (
                                      <>
                                        <div className="flex items-start gap-3">
                                          <div className="mt-0.5"><CheckCircle2 className="w-4 h-4 text-green-500" /></div>
                                          <div>
                                            <p className="text-xs text-gray-500 font-medium">Received</p>
                                            <p className="text-sm text-gray-900 mt-0.5">
                                              {format(new Date(movement.receiveDateTime), "MMM d, yyyy 'at' h:mm a")}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                              Transit time: {formatDistanceToNowStrict(new Date(movement.transferDateTime))}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                          <div className="mt-0.5"><User className="w-4 h-4 text-gray-400" /></div>
                                          <div>
                                            <p className="text-xs text-gray-500 font-medium">Received By</p>
                                            <p className="text-sm text-gray-900 mt-0.5">{movement.receivedBy || "System"}</p>
                                          </div>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="flex flex-col items-center justify-center h-full text-gray-400 py-2">
                                        <Truck className="w-6 h-6 mb-2 text-gray-300" />
                                        <p className="text-sm italic">In Transit...</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Remarks & Courier Footer */}
                                {(movement.courierNumber || movement.remarks) && (
                                  <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl flex flex-wrap gap-x-6 gap-y-2">
                                    {movement.courierNumber && (
                                      <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Truck className="w-4 h-4 text-gray-400" />
                                        <span className="font-medium text-gray-700">Courier:</span> {movement.courierNumber}
                                      </div>
                                    )}
                                    {movement.remarks && (
                                      <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <FileText className="w-4 h-4 text-gray-400" />
                                        <span className="font-medium text-gray-700">Remarks:</span> {movement.remarks}
                                      </div>
                                    )}
                                  </div>
                                )}
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
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                type="button"
                className="inline-flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
