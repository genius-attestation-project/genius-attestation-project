"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

type Message = {
  id: string;
  trackingNumber: string;
  message: string;
  createdAt: string;
  senderUser: { name: string | null };
  senderOffice: { officeName: string } | null;
  receiverOffice: { officeName: string } | null;
  parent: { message: string; senderOffice: { officeName: string } | null } | null;
};

export function CommunicationTimeline({ trackingNumber }: { trackingNumber: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTimeline() {
      try {
        const res = await fetch(`/api/communication/document/${encodeURIComponent(trackingNumber)}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error("Failed to fetch timeline", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTimeline();
  }, [trackingNumber]);

  return (
    <section className="grid gap-3">
      <h3 className="flex items-center gap-2 text-lg font-extrabold">
        <MessageCircle size={18} /> Communication Timeline
      </h3>
      <div className="grid gap-2">
        {loading ? (
          <p className="rounded-2xl border border-dashed border-(--border) p-4 text-sm text-soft">
            Loading timeline...
          </p>
        ) : messages.length ? (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="rounded-2xl border border-(--border) bg-white/70 p-4 dark:bg-white/5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-blue-600 dark:text-blue-400">
                  {msg.senderOffice?.officeName || "System"} 
                  <span className="text-soft font-normal text-xs ml-2">to {msg.receiverOffice?.officeName || "Unknown"}</span>
                </p>
                <p className="text-xs text-muted">{new Date(msg.createdAt).toLocaleString()}</p>
              </div>
              {msg.parent && (
                <div className="mt-2 rounded bg-slate-50 p-2 text-xs text-soft border-l-2 border-slate-300 dark:bg-white/5 dark:border-slate-700">
                  Replying to {msg.parent.senderOffice?.officeName}: "{msg.parent.message}"
                </div>
              )}
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{msg.message}</p>
              <p className="mt-2 text-xs text-muted">Sent by {msg.senderUser?.name}</p>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-(--border) p-4 text-sm text-soft">
            No communication history found for this document.
          </p>
        )}
      </div>
    </section>
  );
}
