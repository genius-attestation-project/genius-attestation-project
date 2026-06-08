import type { Server as HttpServer } from "http";
import type { NextApiRequest, NextApiResponse } from "next";
import { Server as SocketServer } from "socket.io";
import type { Socket as NetSocket } from "net";

import { listDueFollowupRemindersForSocket } from "@/features/lead/server/lead.service";

type SocketServerWithIo = HttpServer & {
  io?: SocketServer;
  followupScheduler?: NodeJS.Timeout;
  followupOwnerAdminIds?: Set<string>;
};

type SocketResponse = NextApiResponse & {
  socket: NetSocket & {
    server: SocketServerWithIo;
  };
};

function startFollowupScheduler(server: SocketServerWithIo) {
  if (!server.io || server.followupScheduler) {
    return;
  }

  server.followupOwnerAdminIds ??= new Set<string>();

  server.followupScheduler = setInterval(() => {
    const ownerAdminIds = Array.from(server.followupOwnerAdminIds ?? []);

    void Promise.all(
      ownerAdminIds.map(async (ownerAdminId) => {
        const reminders = await listDueFollowupRemindersForSocket(ownerAdminId);

        for (const reminder of reminders) {
          if (reminder.assignedUserId) {
            server.io?.to(`user:${reminder.assignedUserId}`).emit("followup-reminder", reminder.payload);
          }

          server.io?.to(`admin:${reminder.ownerAdminId}`).emit("followup-reminder", reminder.payload);
        }
      }),
    ).catch((error) => {
      console.error("Follow-up reminder scheduler failed", error);
    });
  }, 30_000);
}

export default function handler(_req: NextApiRequest, res: SocketResponse) {
  if (!res.socket.server.io) {
    const io = new SocketServer(res.socket.server, {
      path: "/api/socket_io",
      addTrailingSlash: false,
      cors: {
        origin: "*",
      },
    });

    res.socket.server.io = io;
    res.socket.server.followupOwnerAdminIds = new Set<string>();

    io.on("connection", (socket) => {
      const userId = typeof socket.handshake.query.userId === "string"
        ? socket.handshake.query.userId
        : "";
      const ownerAdminId = typeof socket.handshake.query.ownerAdminId === "string"
        ? socket.handshake.query.ownerAdminId
        : "";

      if (userId) {
        void socket.join(`user:${userId}`);
      }

      if (ownerAdminId) {
        void socket.join(`admin:${ownerAdminId}`);
        res.socket.server.followupOwnerAdminIds?.add(ownerAdminId);
      }
    });
  }

  startFollowupScheduler(res.socket.server);
  res.end();
}
