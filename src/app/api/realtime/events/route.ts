import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { realtimeBroadcaster, type RealtimeMovementEvent } from "@/lib/realtime/broadcaster";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.ownerAdminId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const clientId = `${currentUser.id}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const encoder = new TextEncoder();
    let isClosed = false;

    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const sendEvent = (event: RealtimeMovementEvent) => {
      if (isClosed) return;
      try {
        const payload = `data: ${JSON.stringify(event)}\n\n`;
        writer.write(encoder.encode(payload)).catch(() => {
          isClosed = true;
        });
      } catch {
        isClosed = true;
      }
    };

    // Initial greeting / handshake
    writer.write(encoder.encode(`: connected\n\n`)).catch(() => {});

    // Register connected client
    const unregister = realtimeBroadcaster.registerClient({
      id: clientId,
      userId: currentUser.id,
      ownerAdminId: currentUser.ownerAdminId,
      isSuperAdmin: Boolean(currentUser.isSuperAdmin || currentUser.role === "Super Admin"),
      allowedOfficeIds: currentUser.allowedOfficeIds ?? null,
      allowedOfficeNames: currentUser.allowedOfficeNames ?? null,
      moduleOfficeVisibilities: currentUser.moduleOfficeVisibilities ?? null,
      send: sendEvent,
    });

    // Heartbeat interval to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (isClosed) {
        clearInterval(heartbeatInterval);
        return;
      }
      writer.write(encoder.encode(`: ping\n\n`)).catch(() => {
        isClosed = true;
        clearInterval(heartbeatInterval);
        unregister();
      });
    }, 25000);

    req.signal.addEventListener("abort", () => {
      isClosed = true;
      clearInterval(heartbeatInterval);
      unregister();
      try {
        writer.close().catch(() => {});
      } catch {}
    });

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    console.error("[realtime] SSE route error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
