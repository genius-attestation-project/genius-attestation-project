import bcrypt from "bcrypt";

import type { RegisterPayload } from "@/features/auth/types/auth.types";
import { prisma } from "@/lib/prisma";

export async function createUserWithPassword(payload: RegisterPayload) {
  const password = await bcrypt.hash(payload.password, 12);

  return prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      passwordHash: password,
      legacyPasswordHash: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  });
}
