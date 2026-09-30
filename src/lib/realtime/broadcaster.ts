import { hasOfficeAccess } from "@/features/admin/server/rbac.service";

export type RealtimeMovementEvent = {
  type: "DOCUMENT_MOVEMENT_UPDATED";
  action: "transfer" | "receive" | "retrieve" | "send" | "accept" | "rd" | "movement_update";
  ownerAdminId: string;
  fromOfficeId?: string | null;
  toOfficeId?: string | null;
  fromOfficeName?: string | null;
  toOfficeName?: string | null;
  trackingNumbers?: string[];
  bundleId?: string | null;
  timestamp: number;
};

export type ConnectedClient = {
  id: string;
  userId: string;
  ownerAdminId: string;
  isSuperAdmin: boolean;
  allowedOfficeIds: string[] | null;
  allowedOfficeNames: string[] | null;
  moduleOfficeVisibilities: Record<string, { officeIds: string[]; officeNames: string[] }> | null;
  send: (event: RealtimeMovementEvent) => void;
};

class RealtimeBroadcaster {
  private clients: Map<string, ConnectedClient> = new Map();

  public registerClient(client: ConnectedClient): () => void {
    this.clients.set(client.id, client);

    return () => {
      this.clients.delete(client.id);
    };
  }

  public broadcastMovementEvent(event: RealtimeMovementEvent): void {
    const { ownerAdminId, fromOfficeId, toOfficeId, fromOfficeName, toOfficeName } = event;

    for (const client of this.clients.values()) {
      // 1. Tenant boundary enforcement: never leak across different ownerAdminId
      if (client.ownerAdminId !== ownerAdminId) {
        continue;
      }

      // 2. Super Admin can see all office movements within their tenant
      if (client.isSuperAdmin) {
        try {
          client.send(event);
        } catch {
          this.clients.delete(client.id);
        }
        continue;
      }

      // 3. Check office visibility for regular users
      const hasFromAccess =
        (fromOfficeId && hasOfficeAccess(client, fromOfficeId, "home")) ||
        (fromOfficeName && hasOfficeAccess(client, fromOfficeName, "home"));

      const hasToAccess =
        (toOfficeId && hasOfficeAccess(client, toOfficeId, "home")) ||
        (toOfficeName && hasOfficeAccess(client, toOfficeName, "home"));

      // If no specific office was attached to event or client has access to source or destination office
      const isAuthorized = !fromOfficeId && !toOfficeId ? true : Boolean(hasFromAccess || hasToAccess);

      if (isAuthorized) {
        try {
          client.send(event);
        } catch {
          this.clients.delete(client.id);
        }
      }
    }
  }

  public getConnectedCount(): number {
    return this.clients.size;
  }
}

// Global singleton to preserve connection registry across hot module reloads in development
const globalForRealtime = globalThis as unknown as {
  __REALTIME_BROADCASTER__?: RealtimeBroadcaster;
};

export const realtimeBroadcaster =
  globalForRealtime.__REALTIME_BROADCASTER__ ?? new RealtimeBroadcaster();

if (process.env.NODE_ENV !== "production") {
  globalForRealtime.__REALTIME_BROADCASTER__ = realtimeBroadcaster;
}

export function broadcastRealtimeMovement(event: Omit<RealtimeMovementEvent, "type" | "timestamp"> & { timestamp?: number }) {
  try {
    realtimeBroadcaster.broadcastMovementEvent({
      ...event,
      type: "DOCUMENT_MOVEMENT_UPDATED",
      timestamp: event.timestamp || Date.now(),
    });
  } catch (err) {
    console.error("[realtime] Failed to broadcast movement event:", err);
  }
}
