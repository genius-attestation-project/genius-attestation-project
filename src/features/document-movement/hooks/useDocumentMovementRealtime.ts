"use client";

import { useEffect, useRef, useCallback } from "react";
import type { RealtimeMovementEvent } from "@/lib/realtime/broadcaster";

type UseDocumentMovementRealtimeOptions = {
  onMovement: (event?: RealtimeMovementEvent) => void;
  enabled?: boolean;
};

export function useDocumentMovementRealtime({
  onMovement,
  enabled = true,
}: UseDocumentMovementRealtimeOptions) {
  const onMovementRef = useRef(onMovement);
  onMovementRef.current = onMovement;

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerUpdate = useCallback((event?: RealtimeMovementEvent) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    // Debounce rapid bursts of events (e.g. multi-item transfer) by 100ms
    debounceTimerRef.current = setTimeout(() => {
      onMovementRef.current(event);
    }, 100);
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    let eventSource: EventSource | null = null;
    let isMounted = true;

    function connect() {
      try {
        eventSource = new EventSource("/api/realtime/events");

        eventSource.onmessage = (e) => {
          if (!isMounted) return;
          try {
            const data: RealtimeMovementEvent = JSON.parse(e.data);
            if (data.type === "DOCUMENT_MOVEMENT_UPDATED") {
              triggerUpdate(data);
            }
          } catch {
            // Ignore non-JSON or ping comments
          }
        };

        eventSource.onerror = () => {
          // EventSource automatically attempts to reconnect on errors
        };
      } catch (err) {
        console.error("[realtime] EventSource connection failed:", err);
      }
    }

    connect();

    // Revalidate on tab focus / visibility change to guarantee eventual consistency
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && isMounted) {
        triggerUpdate();
      }
    }

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      isMounted = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [enabled, triggerUpdate]);
}
