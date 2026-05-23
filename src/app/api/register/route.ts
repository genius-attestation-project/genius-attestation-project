import bcrypt from "bcrypt";

import { ensureAdminRoles, ensureRbacBootstrap, setUserRole } from "@/features/admin/server/rbac.service";
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
      ownerAdminId: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { ownerAdminId: user.id },
  });

  await ensureRbacBootstrap();
  await ensureAdminRoles(user.id);

  const staffRole = await prisma.accessRole.findFirst({
    where: {
      name: "Staff",
      ownerAdminId: user.id,
    },
    select: { id: true },
  });

  if (staffRole) {
    await setUserRole(user.id, user.id, staffRole.id);
  }

  return jsonOk({ user }, 201);
}
