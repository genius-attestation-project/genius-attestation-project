import bcrypt from "bcrypt";

import { ensureRbacBootstrap, setUserRole } from "@/features/admin/server/rbac.service";
import { registerSchema } from "@/features/auth/validations/auth.schema";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/utils/response";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid request");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (existingUser) {
    return jsonError("An account with this email already exists.", 409);
  }

  const password = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  await ensureRbacBootstrap();

  const staffRole = await prisma.accessRole.findUnique({
    where: { name: "Staff" },
    select: { id: true },
  });

  if (staffRole) {
    await setUserRole(user.id, staffRole.id);
  }

  return jsonOk({ user }, 201);
}
