import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { verifyCoreSubProcessCompleted } from "@/features/process/server/core-subprocess-validation";
import type { CreateOfficeInput, UpdateOfficeInput } from "../validations/office.schema";
import { normalizeOfficeName } from "@/utils/format";

/**
 * Fetch Process Types and Sub Packages options for Create / Edit Form dropdowns & cards
 */
export async function getAssignedOfficeMasterOptions(ownerAdminId: string) {
  const [processTypes, subPackages] = await Promise.all([
    prisma.masterData.findMany({
      where: {
        type: "PROCESS_TYPES",
        ownerAdminId,
        isActive: true,
        isArchived: false,
      },
      include: {
        subPackages: true,
        coreSubPackage: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.subPackage.findMany({
      where: {
        ownerAdminId,
        isActive: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    processTypes: processTypes.map((pt) => ({
      id: pt.id,
      name: pt.name,
      description: pt.description,
      subPackageIds: pt.subPackages.map((sp) => sp.id),
      coreSubPackageId: pt.coreSubPackageId,
    })),
    subPackages: subPackages.map((sp) => ({
      id: sp.id,
      name: sp.name,
      description: sp.description,
    })),
  };
}

/**
 * Helper to resolve both AssignedOffice ID and OfficeLocation ID, supporting ID or Office Name / Username lookup.
 */
export async function resolveOfficeIdentifiers(officeId: string, ownerAdminId?: string) {
  if (!officeId) {
    return {
      assignedOffice: null,
      officeLocation: null,
      assignedOfficeId: null,
      officeLocationId: null,
      allOfficeIds: [] as string[],
      officeName: "",
    };
  }

  const db = prisma as any;

  // 1. Check if officeId matches an AssignedOffice directly
  let assignedOffice = db.assignedOffice
    ? await db.assignedOffice.findFirst({
        where: {
          OR: [{ id: officeId }, { username: officeId }, { email: officeId }],
          ...(ownerAdminId ? { ownerAdminId } : {}),
        },
      })
    : null;

  // 2. Check if officeId matches an OfficeLocation directly
  let officeLocation = await prisma.officeLocation.findFirst({
    where: {
      OR: [{ id: officeId }, { officeName: officeId }],
      ...(ownerAdminId ? { ownerAdminId } : {}),
    },
  });

  // Cross-match: if we have officeLocation but not assignedOffice, find assignedOffice by username matching officeName
  if (officeLocation && !assignedOffice && db.assignedOffice) {
    assignedOffice = await db.assignedOffice.findFirst({
      where: {
        username: officeLocation.officeName,
        ...(ownerAdminId ? { ownerAdminId } : {}),
      },
    });
  }

  // Cross-match: if we have assignedOffice but not officeLocation, find officeLocation by officeName matching username
  if (assignedOffice && !officeLocation) {
    officeLocation = await prisma.officeLocation.findFirst({
      where: {
        officeName: assignedOffice.username,
        ...(ownerAdminId ? { ownerAdminId } : {}),
      },
    });
  }

  const allOfficeIds = Array.from(
    new Set([assignedOffice?.id, officeLocation?.id, officeId].filter(Boolean))
  ) as string[];

  return {
    assignedOffice,
    officeLocation,
    assignedOfficeId: assignedOffice?.id || officeLocation?.id || officeId,
    officeLocationId: officeLocation?.id || assignedOffice?.id || officeId,
    allOfficeIds,
    officeName: officeLocation?.officeName || assignedOffice?.username || officeId,
  };
}

/**
 * Fetch Sub Packages dynamically filtered by Process Type name
 */
export async function getSubPackagesForProcessType(
  processTypeName: string | null | undefined,
  ownerAdminId: string,
  officeId?: string
) {
  if (processTypeName) {
    const ptMaster = await prisma.masterData.findFirst({
      where: {
        type: "PROCESS_TYPES",
        name: processTypeName,
        ownerAdminId,
      },
      include: {
        subPackages: true,
        coreSubPackage: true,
      },
    });

    if (ptMaster && ptMaster.subPackages.length > 0) {
      return ptMaster.subPackages.map((sp) => ({
        id: sp.id,
        name: sp.name,
        description: sp.description,
        isCorePackage: sp.id === ptMaster.coreSubPackageId,
      }));
    }
  }

  // If officeId is provided, scope fallback to sub-packages assigned to that office only.
  // This prevents showing ALL system sub-processes in the transfer dropdown.
  if (officeId) {
    const { allOfficeIds } = await resolveOfficeIdentifiers(officeId, ownerAdminId);
    const officeSubPackages = await (prisma as any).assignedOfficeSubPackage.findMany({
      where: { assignedOfficeId: { in: allOfficeIds } },
    });
    const assignedIds: string[] = officeSubPackages.map((sp: any) => sp.subPackageId as string);
    const coreItem = officeSubPackages.find((sp: any) => sp.isCorePackage);

    if (assignedIds.length > 0) {
      const subPackages = await prisma.subPackage.findMany({
        where: { id: { in: assignedIds }, isActive: true },
        orderBy: { name: "asc" },
      });
      return subPackages.map((sp) => ({
        id: sp.id,
        name: sp.name,
        description: sp.description,
        isCorePackage: sp.id === coreItem?.subPackageId,
      }));
    }

    // No sub-packages assigned to this office — return empty list
    return [];
  }

  // Fallback to all active subpackages for this owner (used only when no officeId is known)
  const allSubPackages = await prisma.subPackage.findMany({
    where: { ownerAdminId, isActive: true },
    orderBy: { name: "asc" },
  });

  return allSubPackages.map((sp) => ({
    id: sp.id,
    name: sp.name,
    description: sp.description,
    isCorePackage: false,
  }));
}


/**
 * List Assigned Offices with pagination, search, status filter, and sorting
 */
export async function listAssignedOffices(params: {
  ownerAdminId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string; // 'All' | 'Active' | 'Inactive'
  processTypeId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, params.pageSize || 10);
  const skip = (page - 1) * pageSize;

  const where: any = {
    ownerAdminId: params.ownerAdminId,
  };

  if (params.search && params.search.trim() !== "") {
    const q = params.search.trim();
    where.OR = [
      { username: { contains: q } },
      { email: { contains: q } },
    ];
  }

  if (params.status && params.status !== "All") {
    where.status = params.status === "Active";
  }

  if (params.processTypeId && params.processTypeId !== "All") {
    where.processTypes = {
      some: {
        processTypeId: params.processTypeId,
      },
    };
  }

  const orderByField = params.sortBy || "createdAt";
  const orderByDirection = params.sortOrder || "desc";

  const [total, items] = await Promise.all([
    (prisma as any).assignedOffice.count({ where }),
    (prisma as any).assignedOffice.findMany({
      where,
      include: {
        processTypes: true,
        subPackages: true,
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
      orderBy: { [orderByField]: orderByDirection },
      skip,
      take: pageSize,
    }),
  ]);

  // Fetch process type names and subpackage names from master tables
  const allProcessTypeIds = Array.from(
    new Set((items as any[]).flatMap((o: any) => o.processTypes.map((pt: any) => pt.processTypeId)))
  ) as string[];
  const allSubPackageIds = Array.from(
    new Set((items as any[]).flatMap((o: any) => o.subPackages.map((sp: any) => sp.subPackageId)))
  ) as string[];

  const [masterProcessTypes, masterSubPackages] = await Promise.all([
    prisma.masterData.findMany({
      where: { id: { in: allProcessTypeIds } },
      select: { id: true, name: true },
    }),
    prisma.subPackage.findMany({
      where: { id: { in: allSubPackageIds }, isActive: true },
      select: { id: true, name: true },
    }),
  ]);

  const ptMap = new Map((masterProcessTypes as any[]).map((pt: any) => [pt.id, pt.name]));
  const spMap = new Map((masterSubPackages as any[]).map((sp: any) => [sp.id, sp.name]));

  const formattedItems = (items as any[]).map((office: any) => {
    const assignedProcessTypes = office.processTypes.map((pt: any) => ({
      id: pt.processTypeId,
      name: ptMap.get(pt.processTypeId) || "Unknown Process Type",
    }));

    // Only include sub-packages that still exist in the master table.
    // Orphaned mappings (where the SubPackage was deleted) are silently
    // excluded so deleted sub-processes never appear as "Unknown Sub Package".
    const assignedSubPackages = office.subPackages
      .filter((sp: any) => spMap.has(sp.subPackageId))
      .map((sp: any) => ({
        id: sp.subPackageId,
        name: spMap.get(sp.subPackageId) as string,
        isCorePackage: sp.isCorePackage,
      }));


    // Resolve corePackage: only if the mapping's sub-package still exists
    const corePackageItem = office.subPackages.find(
      (sp: any) => sp.isCorePackage && spMap.has(sp.subPackageId)
    );
    const corePackage = corePackageItem
      ? {
        id: corePackageItem.subPackageId,
        name: spMap.get(corePackageItem.subPackageId) as string,
      }
      : null;


    return {
      id: office.id,
      username: office.username,
      email: office.email,
      status: office.status,
      lastLogin: office.lastLogin,
      createdBy: office.createdBy,
      updatedBy: office.updatedBy,
      createdAt: office.createdAt,
      updatedAt: office.updatedAt,
      assignedProcessTypes,
      assignedSubPackages,
      corePackage,
      auditLogs: office.auditLogs,
    };
  });

  return {
    items: formattedItems,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get single Assigned Office details
 */
export async function getAssignedOfficeById(id: string, ownerAdminId: string) {
  const office = await (prisma as any).assignedOffice.findFirst({
    where: { id, ownerAdminId },
    include: {
      processTypes: true,
      subPackages: true,
      auditLogs: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!office) return null;

  const ptIds = office.processTypes.map((pt: any) => pt.processTypeId);
  const spIds = office.subPackages.map((sp: any) => sp.subPackageId);

  const [masterProcessTypes, masterSubPackages] = await Promise.all([
    prisma.masterData.findMany({
      where: { id: { in: ptIds } },
      select: { id: true, name: true },
    }),
    prisma.subPackage.findMany({
      where: { id: { in: spIds }, isActive: true },
      select: { id: true, name: true },
    }),
  ]);

  const ptMap = new Map(masterProcessTypes.map((pt: any) => [pt.id, pt.name]));
  const spMap = new Map(masterSubPackages.map((sp: any) => [sp.id, sp.name]));

  const coreItem = office.subPackages.find((sp: any) => sp.isCorePackage);

  return {
    id: office.id,
    username: office.username,
    email: office.email,
    status: office.status,
    lastLogin: office.lastLogin,
    createdBy: office.createdBy,
    updatedBy: office.updatedBy,
    createdAt: office.createdAt,
    updatedAt: office.updatedAt,
    processTypes: office.processTypes.map((pt: any) => ({
      id: pt.processTypeId,
      name: ptMap.get(pt.processTypeId) || "Unknown",
    })),
    // Exclude orphaned sub-package mappings (deleted SubPackage records)
    subPackages: office.subPackages
      .filter((sp: any) => spMap.has(sp.subPackageId))
      .map((sp: any) => ({
        id: sp.subPackageId,
        name: spMap.get(sp.subPackageId) as string,
        isCorePackage: sp.isCorePackage,
      })),
    // Exclude corePackage if its sub-package no longer exists
    corePackage: coreItem && spMap.has(coreItem.subPackageId)
      ? {
        id: coreItem.subPackageId,
        name: spMap.get(coreItem.subPackageId) as string,
      }
      : null,
    auditLogs: office.auditLogs,
  };
}

/**
 * Create Assigned Office
 */
export async function createAssignedOffice(
  input: CreateOfficeInput,
  currentUserId: string,
  performedByName: string,
  ownerAdminId: string
) {
  const normalizedUsername = normalizeOfficeName(input.username);

  // Check unique username & email
  const [existingOfficeUser, existingOfficeEmail, existingUserUser, existingUserEmail] =
    await Promise.all([
      (prisma as any).assignedOffice.findUnique({ where: { username: normalizedUsername } }),
      (prisma as any).assignedOffice.findUnique({ where: { email: input.email } }),
      prisma.user.findUnique({ where: { email: normalizedUsername } }),
      prisma.user.findUnique({ where: { email: input.email } }),
    ]);

  if (existingOfficeUser || existingUserUser) {
    throw new Error("Username is already taken.");
  }
  if (existingOfficeEmail || existingUserEmail) {
    throw new Error("Email is already in use.");
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(input.password, salt);

  const subPkgIds = input.subPackages || [];
  let derivedProcessTypeIds = input.processTypes || [];
  let derivedCorePackageId = input.corePackageId || "";

  if (subPkgIds.length > 0) {
    const matchingProcessTypes = await prisma.masterData.findMany({
      where: {
        type: "PROCESS_TYPES",
        ownerAdminId,
        isActive: true,
        isArchived: false,
        subPackages: {
          some: {
            id: { in: subPkgIds },
          },
        },
      },
      select: {
        id: true,
        coreSubPackageId: true,
      },
    });

    if (!derivedProcessTypeIds || derivedProcessTypeIds.length === 0) {
      derivedProcessTypeIds = matchingProcessTypes.map((pt) => pt.id);
    }

    if (!derivedCorePackageId) {
      const foundCore = matchingProcessTypes.find(
        (pt) => pt.coreSubPackageId && subPkgIds.includes(pt.coreSubPackageId)
      );
      derivedCorePackageId = foundCore?.coreSubPackageId || subPkgIds[0] || "";
    }
  }

  return prisma.$transaction(async (tx: any) => {
    const office = await tx.assignedOffice.create({
      data: {
        username: normalizedUsername,
        email: input.email,
        passwordHash,
        status: input.status !== undefined ? input.status : true,
        createdBy: performedByName || currentUserId,
        ownerAdminId,
      },
    });

    // Create process type assignments
    if (derivedProcessTypeIds && derivedProcessTypeIds.length > 0) {
      await tx.assignedOfficeProcessType.createMany({
        data: derivedProcessTypeIds.map((ptId: any) => ({
          assignedOfficeId: office.id,
          processTypeId: ptId,
        })),
      });
    }

    // Create subpackage assignments
    if (subPkgIds && subPkgIds.length > 0) {
      await tx.assignedOfficeSubPackage.createMany({
        data: subPkgIds.map((spId: any) => ({
          assignedOfficeId: office.id,
          subPackageId: spId,
          isCorePackage: spId === derivedCorePackageId,
        })),
      });
    }

    // Audit Log Entries
    await tx.assignedOfficeAuditLog.createMany({
      data: [
        {
          assignedOfficeId: office.id,
          action: "Office Created",
          description: `Assigned Office account '${office.username}' (${office.email}) created.`,
          performedBy: performedByName || currentUserId,
        },
        {
          assignedOfficeId: office.id,
          action: "Process Type Changed",
          description: `Assigned ${derivedProcessTypeIds.length} Process Type(s).`,
          performedBy: performedByName || currentUserId,
        },
        {
          assignedOfficeId: office.id,
          action: "Sub Package Changed",
          description: `Assigned ${subPkgIds.length} Sub Package(s).`,
          performedBy: performedByName || currentUserId,
        },
      ],
    });

    // Sync with OfficeLocation so document movement foreign keys match seamlessly
    await tx.officeLocation.upsert({
      where: {
        officeName_ownerAdminId: {
          officeName: office.username,
          ownerAdminId,
        },
      },
      create: {
        id: office.id,
        officeName: office.username,
        location: "External Processing Office",
        timezone: "UTC",
        isProcessOffice: true,
        ownerAdminId,
      },
      update: {
        isProcessOffice: true,
      },
    });

    return office;
  });
}

/**
 * Update Assigned Office
 */
export async function updateAssignedOffice(
  id: string,
  input: UpdateOfficeInput,
  currentUserId: string,
  performedByName: string,
  ownerAdminId: string
) {
  const existingOffice = await (prisma as any).assignedOffice.findFirst({
    where: { id, ownerAdminId },
  });

  if (!existingOffice) {
    throw new Error("Assigned Office not found.");
  }

  let normalizedUsername: string | undefined = undefined;
  if (input.username) {
    normalizedUsername = normalizeOfficeName(input.username);
    if (normalizedUsername !== existingOffice.username) {
      const takenUser = await (prisma as any).assignedOffice.findUnique({
        where: { username: normalizedUsername },
      });
      if (takenUser) throw new Error("Username is already taken.");
    }
  }

  if (input.email && input.email !== existingOffice.email) {
    const takenEmail = await (prisma as any).assignedOffice.findUnique({
      where: { email: input.email },
    });
    if (takenEmail) throw new Error("Email is already in use.");
  }

  return prisma.$transaction(async (tx: any) => {
    const auditLogs: Array<{ action: string; description: string }> = [];

    const finalUsername = normalizedUsername ?? existingOffice.username;

    const updateData: any = {
      username: finalUsername,
      email: input.email ?? existingOffice.email,
      status: input.status !== undefined ? input.status : existingOffice.status,
      updatedBy: performedByName || currentUserId,
    };

    if (input.password && input.password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(input.password, salt);
      auditLogs.push({
        action: "Password Reset",
        description: "Password updated for Assigned Office user.",
      });
    }

    if (input.status !== undefined && input.status !== existingOffice.status) {
      auditLogs.push({
        action: "Status Changed",
        description: `Status changed to ${input.status ? "Active" : "Inactive"}.`,
      });
    }

    const updatedOffice = await tx.assignedOffice.update({
      where: { id },
      data: updateData,
    });

    if (input.subPackages && input.subPackages.length > 0) {
      const subPkgIds = input.subPackages;
      let derivedProcessTypeIds = input.processTypes || [];
      let derivedCorePackageId = input.corePackageId || "";

      const matchingProcessTypes = await prisma.masterData.findMany({
        where: {
          type: "PROCESS_TYPES",
          ownerAdminId,
          isActive: true,
          isArchived: false,
          subPackages: {
            some: {
              id: { in: subPkgIds },
            },
          },
        },
        select: {
          id: true,
          coreSubPackageId: true,
        },
      });

      if (!derivedProcessTypeIds || derivedProcessTypeIds.length === 0) {
        derivedProcessTypeIds = matchingProcessTypes.map((pt) => pt.id);
      }

      if (!derivedCorePackageId) {
        const foundCore = matchingProcessTypes.find(
          (pt) => pt.coreSubPackageId && subPkgIds.includes(pt.coreSubPackageId)
        );
        derivedCorePackageId = foundCore?.coreSubPackageId || subPkgIds[0] || "";
      }

      await tx.assignedOfficeProcessType.deleteMany({
        where: { assignedOfficeId: id },
      });
      if (derivedProcessTypeIds.length > 0) {
        await tx.assignedOfficeProcessType.createMany({
          data: derivedProcessTypeIds.map((ptId: any) => ({
            assignedOfficeId: id,
            processTypeId: ptId,
          })),
        });
      }
      auditLogs.push({
        action: "Process Type Changed",
        description: `Updated assigned Process Types to ${derivedProcessTypeIds.length} item(s).`,
      });

      await tx.assignedOfficeSubPackage.deleteMany({
        where: { assignedOfficeId: id },
      });
      await tx.assignedOfficeSubPackage.createMany({
        data: subPkgIds.map((spId: any) => ({
          assignedOfficeId: id,
          subPackageId: spId,
          isCorePackage: spId === derivedCorePackageId,
        })),
      });
      auditLogs.push({
        action: "Sub Package Changed",
        description: `Updated assigned Sub Packages to ${subPkgIds.length} item(s).`,
      });
    }

    auditLogs.push({
      action: "Office Updated",
      description: `Office parameters updated by ${performedByName || currentUserId}.`,
    });

    await tx.assignedOfficeAuditLog.createMany({
      data: auditLogs.map((log) => ({
        assignedOfficeId: id,
        action: log.action,
        description: log.description,
        performedBy: performedByName || currentUserId,
      })),
    });

    return updatedOffice;
  });
}

/**
 * Toggle Status (Activate / Deactivate)
 */
export async function toggleOfficeStatus(
  id: string,
  isActive: boolean,
  currentUserId: string,
  performedByName: string,
  ownerAdminId: string
) {
  const office = await (prisma as any).assignedOffice.findFirst({
    where: { id, ownerAdminId },
  });

  if (!office) throw new Error("Assigned Office not found.");

  return prisma.$transaction(async (tx: any) => {
    const updated = await tx.assignedOffice.update({
      where: { id },
      data: {
        status: isActive,
        updatedBy: performedByName || currentUserId,
      },
    });

    await tx.assignedOfficeAuditLog.create({
      data: {
        assignedOfficeId: id,
        action: "Status Changed",
        description: `Assigned Office status set to ${isActive ? "Active" : "Inactive"}.`,
        performedBy: performedByName || currentUserId,
      },
    });

    return updated;
  });
}

/**
 * Reset Password
 */
export async function resetOfficePassword(
  id: string,
  newPassword: string,
  currentUserId: string,
  performedByName: string,
  ownerAdminId: string
) {
  const office = await (prisma as any).assignedOffice.findFirst({
    where: { id, ownerAdminId },
  });

  if (!office) throw new Error("Assigned Office not found.");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  return prisma.$transaction(async (tx: any) => {
    const updated = await tx.assignedOffice.update({
      where: { id },
      data: {
        passwordHash,
        updatedBy: performedByName || currentUserId,
      },
    });

    await tx.assignedOfficeAuditLog.create({
      data: {
        assignedOfficeId: id,
        action: "Password Reset",
        description: `Password reset successfully by ${performedByName || currentUserId}.`,
        performedBy: performedByName || currentUserId,
      },
    });

    return updated;
  });
}

/**
 * Delete Assigned Office
 */
export async function deleteAssignedOffice(
  id: string,
  currentUserId: string,
  performedByName: string,
  ownerAdminId: string
) {
  const office = await (prisma as any).assignedOffice.findFirst({
    where: { id, ownerAdminId },
  });

  if (!office) throw new Error("Assigned Office not found.");

  return (prisma as any).assignedOffice.delete({
    where: { id },
  });
}

/**
 * Export Assigned Offices list dataset for Excel download
 */
export async function exportAssignedOfficesData(ownerAdminId: string) {
  const offices = await (prisma as any).assignedOffice.findMany({
    where: { ownerAdminId },
    include: {
      processTypes: true,
      subPackages: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const ptIds = Array.from(new Set(offices.flatMap((o: any) => o.processTypes.map((pt: any) => pt.processTypeId)))) as string[];
  const spIds = Array.from(new Set(offices.flatMap((o: any) => o.subPackages.map((sp: any) => sp.subPackageId)))) as string[];

  const [masterProcessTypes, masterSubPackages] = await Promise.all([
    prisma.masterData.findMany({
      where: { id: { in: ptIds } },
      select: { id: true, name: true },
    }),
    prisma.subPackage.findMany({
      where: { id: { in: spIds } },
      select: { id: true, name: true },
    }),
  ]);

  const ptMap = new Map(masterProcessTypes.map((pt: any) => [pt.id, pt.name]));
  const spMap = new Map(masterSubPackages.map((sp: any) => [sp.id, sp.name]));

  return offices.map((office: any) => {
    const ptNames = office.processTypes.map((pt: any) => ptMap.get(pt.processTypeId) || "Unknown").join(", ");
    const spNames = office.subPackages.map((sp: any) => spMap.get(sp.subPackageId) || "Unknown").join(", ");
    const coreSp = office.subPackages.find((sp: any) => sp.isCorePackage);
    const coreName = coreSp ? spMap.get(coreSp.subPackageId) || "None" : "None";

    return {
      Username: office.username,
      Email: office.email,
      "Assigned Sub Processes": spNames,
      Status: office.status ? "Active" : "Inactive",
      "Last Login": office.lastLogin ? new Date(office.lastLogin).toLocaleString() : "Never",
      "Created Date": new Date(office.createdAt).toLocaleString(),
      "Created By": office.createdBy || "System",
    };
  });
}

/**
 * WORKSPACE: Get counts for workspace tabs
 */
export async function getAssignedOfficeWorkspaceStats(officeId: string, ownerAdminId: string) {
  const { allOfficeIds } = await resolveOfficeIdentifiers(officeId, ownerAdminId);

  const inboundBundlesCount = await (prisma as any).bundle.count({
    where: {
      toOfficeId: { in: allOfficeIds },
      ownerAdminId,
      status: { in: ["Pending Receive", "Partially Received", "INBOUND_PENDING"] },
    },
  });

  const inHandDocsCount = await prisma.registration.count({
    where: {
      ownerAdminId,
      documentMovements: {
        some: {
          currentOfficeId: { in: allOfficeIds },
          status: { in: ["Received", "Document In Hand", "In Hand"] },
          currentStatus: { notIn: ["Completed", "Returned", "Rejected"] },
        },
      },
    },
  });

  const completedDocsCount = await prisma.registration.count({
    where: {
      ownerAdminId,
      documentMovements: {
        some: {
          currentOfficeId: { in: allOfficeIds },
          currentStatus: "Completed",
        },
      },
    },
  });

  const returnedDocsCount = await prisma.registration.count({
    where: {
      ownerAdminId,
      documentMovements: {
        some: {
          currentOfficeId: { in: allOfficeIds },
          currentStatus: "Returned",
        },
      },
    },
  });

  const rejectedDocsCount = await prisma.registration.count({
    where: {
      ownerAdminId,
      documentMovements: {
        some: {
          currentOfficeId: { in: allOfficeIds },
          currentStatus: "Rejected",
        },
      },
    },
  });

  const rawHistoryBundles = await (prisma as any).bundle.findMany({
    where: {
      fromOfficeId: { in: allOfficeIds },
      ownerAdminId,
      status: { notIn: ["Received", "Retrieved", "Cancelled", "Completed"] },
    },
    include: {
      items: true,
    },
  });

  const historyCount = rawHistoryBundles.filter((b: any) =>
    b.items.some((item: any) => item.status !== "Received" && item.status !== "Retrieved" && item.status !== "Completed")
  ).length;

  return {
    inboundCount: inboundBundlesCount,
    inHandCount: inHandDocsCount,
    completedCount: completedDocsCount,
    returnedCount: returnedDocsCount,
    rejectedCount: rejectedDocsCount,
    historyCount,
  };
}

/**
 * WORKSPACE: List documents by tab
 */
export async function listWorkspaceDocuments(params: {
  officeId: string;
  tab: string; // 'inbound' | 'in_hand' | 'complete' | 'return' | 'rejected' | 'history'
  ownerAdminId: string;
  search?: string;
}) {
  const { allOfficeIds } = await resolveOfficeIdentifiers(params.officeId, params.ownerAdminId);

  const searchWhere =
    params.search && params.search.trim() !== ""
      ? {
        OR: [
          { trackingNumber: { contains: params.search.trim() } },
          { customerName: { contains: params.search.trim() } },
          { documentType: { contains: params.search.trim() } },
          { processType: { contains: params.search.trim() } },
        ],
      }
      : {};

  if (params.tab === "inbound") {
    // Inbound to Assigned Office must only include bundles directed to this Assigned Office
    const rawBundles = await (prisma as any).bundle.findMany({
      where: {
        toOfficeId: { in: allOfficeIds },
        ownerAdminId: params.ownerAdminId,
        status: { in: ["Pending Receive", "Partially Received", "INBOUND_PENDING"] },
      },
      include: {
        fromOffice: true,
        toOffice: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const trackingNumbers: string[] = Array.from(
      new Set(rawBundles.flatMap((b: any) => b.items.map((i: any) => i.trackingNumber as string)))
    );

    const [registrations, activeProcessReturnMovs] = await Promise.all([
      prisma.registration.findMany({
        where: { trackingNumber: { in: trackingNumbers } },
      }),
      prisma.documentMovement.findMany({
        where: {
          trackingNumber: { in: trackingNumbers },
          currentModule: "PROCESS_MODULE",
          toModule: "PROCESS_MODULE",
          movementType: "BACK_TO_PROCESS",
          status: "INBOUND",
        },
        select: { trackingNumber: true },
      }),
    ]);

    const processReturnSet = new Set(activeProcessReturnMovs.map((m) => m.trackingNumber));
    const regMap = new Map(registrations.map((r) => [r.trackingNumber, r]));

    // Strictly exclude any bundles whose items are active Back to Process returns
    const bundles = rawBundles.filter((b: any) =>
      !b.items.some((i: any) => processReturnSet.has(i.trackingNumber))
    );

    return bundles.map((b: any) => ({
      ...b,
      items: b.items.map((i: any) => ({
        ...i,
        registration: regMap.get(i.trackingNumber) || null,
      })),
    }));
  }

  if (params.tab === "complete") {
    return prisma.registration.findMany({
      where: {
        ownerAdminId: params.ownerAdminId,
        ...searchWhere,
        documentMovements: {
          some: {
            currentOfficeId: { in: allOfficeIds },
            currentStatus: "Completed",
          },
        },
      },
      include: { documentMovements: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  if (params.tab === "return") {
    return prisma.registration.findMany({
      where: {
        ownerAdminId: params.ownerAdminId,
        ...searchWhere,
        documentMovements: {
          some: {
            currentOfficeId: { in: allOfficeIds },
            currentStatus: "Returned",
          },
        },
      },
      include: { documentMovements: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  if (params.tab === "rejected") {
    return prisma.registration.findMany({
      where: {
        ownerAdminId: params.ownerAdminId,
        ...searchWhere,
        documentMovements: {
          some: {
            currentOfficeId: { in: allOfficeIds },
            currentStatus: "Rejected",
          },
        },
      },
      include: { documentMovements: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  if (params.tab === "history") {
    const rawBundles = await (prisma as any).bundle.findMany({
      where: {
        fromOfficeId: { in: allOfficeIds },
        ownerAdminId: params.ownerAdminId,
      },
      include: {
        fromOffice: true,
        toOffice: true,
        items: true,
        movements: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const trackingNumbers: string[] = Array.from(
      new Set(rawBundles.flatMap((b: any) => b.items.map((i: any) => i.trackingNumber as string)))
    );

    const [registrations, movements] = await Promise.all([
      prisma.registration.findMany({
        where: { trackingNumber: { in: trackingNumbers } },
      }),
      prisma.documentMovement.findMany({
        where: { trackingNumber: { in: trackingNumbers } },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const regMap = new Map(registrations.map((r) => [r.trackingNumber, r]));
    const movMap = new Map<string, any>();
    for (const mov of movements) {
      if (!movMap.has(mov.trackingNumber)) {
        movMap.set(mov.trackingNumber, mov);
      }
    }

    const filteredBundles: any[] = [];

    for (const b of rawBundles) {
      // An item is actively in-transit / unreceived if:
      // 1. Bundle item status is not "Received" and not "Retrieved" and not "Completed"
      // 2. DocumentMovement does not show it has already been received at the destination office or retrieved back
      const activeItems = b.items.filter((item: any) => {
        if (item.status === "Received" || item.status === "Retrieved" || item.status === "Completed") {
          return false;
        }
        const mov = movMap.get(item.trackingNumber);
        if (mov) {
          // If destination office received it into their in-hand
          const isReceivedAtDest =
            mov.currentOfficeId === b.toOfficeId &&
            (mov.status === "Received" || mov.currentStatus === "Document In Hand" || mov.currentStatus === "In Hand");
          if (isReceivedAtDest) return false;

          // If sender office already retrieved it back into in-hand
          const isRetrievedBySender =
            allOfficeIds.includes(mov.currentOfficeId) &&
            (mov.status === "Document In Hand" || mov.currentStatus === "Document In Hand") &&
            mov.status !== "INBOUND";
          if (isRetrievedBySender) return false;
        }
        return true;
      });

      // Disappearance rule: If no active documents remain in this bundle, do not show it in active History
      if (activeItems.length === 0) {
        continue;
      }

      const bundleMovement = b.movements?.[0];
      const workflowStep =
        bundleMovement?.movementType === "BACK_TO_PROCESS"
          ? "Back to Process"
          : bundleMovement?.movementType || `Transferred to ${b.toOffice?.officeName || "Process"}`;

      const enrichedActiveItems = activeItems.map((item: any) => {
        const reg = regMap.get(item.trackingNumber);
        return {
          ...item,
          registration: reg || null,
          customerName: reg?.customerName || (reg as any)?.clientName || null,
          documentType: reg?.documentType || null,
          processType: reg?.processType || reg?.externalProcess || null,
          createdAt: reg?.createdAt || item.createdAt,
        };
      });

      const enrichedBundle = {
        id: b.id,
        bundleId: b.id,
        bundleNumber: b.bundleNumber,
        fromOfficeId: b.fromOfficeId,
        fromOffice: b.fromOffice,
        toOfficeId: b.toOfficeId,
        toOffice: b.toOffice,
        status: b.status,
        workflowStep,
        performedBy: b.createdBy || bundleMovement?.performedBy || "System",
        performedAt: b.createdAt,
        createdAt: b.createdAt,
        remarks: bundleMovement?.remarks || `Transferred to ${b.toOffice?.officeName || "Process"}`,
        totalDocuments: b.items.length,
        activeRemainingCount: activeItems.length,
        items: enrichedActiveItems,
        allItems: b.items,
      };

      // Search filter if provided
      if (params.search && params.search.trim()) {
        const q = params.search.trim().toLowerCase();
        const matchesBundle =
          b.bundleNumber.toLowerCase().includes(q) ||
          (b.toOffice?.officeName && b.toOffice.officeName.toLowerCase().includes(q)) ||
          workflowStep.toLowerCase().includes(q) ||
          (b.createdBy && b.createdBy.toLowerCase().includes(q));

        const matchesItem = enrichedActiveItems.some((item: any) => {
          const reg = item.registration;
          return (
            item.trackingNumber.toLowerCase().includes(q) ||
            (reg?.customerName && reg.customerName.toLowerCase().includes(q)) ||
            (reg?.documentType && reg.documentType.toLowerCase().includes(q)) ||
            (reg?.processType && reg.processType.toLowerCase().includes(q))
          );
        });

        if (!matchesBundle && !matchesItem) {
          continue;
        }
      }

      filteredBundles.push(enrichedBundle);
    }

    return filteredBundles;
  }

  // Default: 'in_hand'
  // Excludes documents transferred to a Sub Package (currentStatus = "In Sub Package")
  return prisma.registration.findMany({
    where: {
      ownerAdminId: params.ownerAdminId,
      ...searchWhere,
      documentMovements: {
        some: {
          currentOfficeId: { in: allOfficeIds },
          status: { in: ["Received", "Document In Hand", "In Hand", "HOME"] },
          currentStatus: { notIn: ["Completed", "Returned", "Rejected", "In Sub Package"] },
        },
      },
    },
    include: { documentMovements: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * WORKSPACE: Receive Inbound Bundle Items (Partial Receive supported)
 */
export async function receiveBundleDocuments(params: {
  bundleId: string;
  selectedTrackingNumbers: string[];
  officeId: string;
  userId: string;
  userName?: string;
  ownerAdminId: string;
}) {
  return prisma.$transaction(async (tx: any) => {
    const bundle = await tx.bundle.findUnique({
      where: { id: params.bundleId },
      include: { items: true },
    });

    if (!bundle) throw new Error("Bundle not found.");

    const totalItems = bundle.items.length;
    const selectedSet = new Set(params.selectedTrackingNumbers);

    for (const item of bundle.items) {
      if (selectedSet.has(item.trackingNumber)) {
        await tx.bundleItem.update({
          where: { id: item.id },
          data: {
            status: "Received",
            receivedAt: new Date(),
            receivedBy: params.userName || params.userId,
          },
        });

        const reg = await tx.registration.findUnique({
          where: { trackingNumber: item.trackingNumber },
          include: { documentMovements: true },
        });

        const mainProcessCheck = await verifyCoreSubProcessCompleted(item.trackingNumber, params.ownerAdminId);
        const hasCompletedMainProcess = mainProcessCheck.isCompleted;

        let targetOffice = await tx.officeLocation.findFirst({
          where: { OR: [{ id: params.officeId }, { officeName: params.officeId }] },
        });

        if (!targetOffice) {
          const ao = await tx.assignedOffice.findUnique({ where: { id: params.officeId } });
          if (ao) {
            targetOffice = await tx.officeLocation.findFirst({
              where: { officeName: ao.username, ownerAdminId: params.ownerAdminId },
            });
            if (!targetOffice) {
              targetOffice = await tx.officeLocation.create({
                data: {
                  id: params.officeId,
                  officeName: ao.username,
                  location: "External Processing Office",
                  timezone: "UTC",
                  isProcessOffice: true,
                  ownerAdminId: params.ownerAdminId,
                },
              });
            }
          }
        }

        const resolvedOfficeId = targetOffice?.id || params.officeId;
        const receivingOfficeName = targetOffice?.officeName || params.officeId;
        const deliveryLocation = reg?.deliveryLocation || "";

        // Document moves to Ready For Delivery ONLY when ALL processing is complete AND receiving office matches deliveryLocation
        const isReadyForDeliveryAutoRoute =
          hasCompletedMainProcess &&
          Boolean(receivingOfficeName && deliveryLocation && receivingOfficeName.trim().toLowerCase() === deliveryLocation.trim().toLowerCase());

        if (isReadyForDeliveryAutoRoute) {
          await tx.documentMovement.updateMany({
            where: { trackingNumber: item.trackingNumber },
            data: {
              currentOfficeId: resolvedOfficeId,
              status: "Ready for Delivery",
              currentModule: "READY_FOR_DELIVERY",
              currentStatus: "READY_FOR_DELIVERY",
              receivedBy: params.userName || params.userId,
              receivedAt: new Date(),
            },
          });

          if (reg) {
            await tx.registration.update({
              where: { trackingNumber: item.trackingNumber },
              data: {
                trackingStatus: "Ready for Delivery",
                bmStatus: "Ready for Delivery",
              },
            });

            await tx.documentWorkflowHistory.create({
              data: {
                documentId: reg.id,
                trackingNumber: item.trackingNumber,
                workflowStep: "Automatic Ready For Delivery Routing",
                status: "Ready for Delivery",
                performedBy: params.userName || params.userId,
                remarks: `Routed to Ready For Delivery (Process Type Main Process activity status is Completed)`,
                ownerAdminId: params.ownerAdminId,
              },
            });

            await tx.movementHistory.create({
              data: {
                trackingNumber: item.trackingNumber,
                action: "Automatic Ready For Delivery Route",
                oldStatus: "Pending Receive",
                newStatus: "Ready for Delivery",
                oldOffice: bundle.fromOffice?.officeName || null,
                newOffice: receivingOfficeName,
                performedBy: params.userName || params.userId,
                remarks: `Received into Ready For Delivery from Bundle ${bundle.bundleNumber}`,
              },
            });

            await tx.auditTrail.create({
              data: {
                registrationId: reg.id,
                action: "AUTO_ROUTED_TO_READY_FOR_DELIVERY",
                performedBy: params.userName || params.userId,
                description: `Process Type Main Process activity status is Completed. Routed to Ready For Delivery.`,
              },
            });
          }
        } else {
          await tx.documentMovement.updateMany({
            where: { trackingNumber: item.trackingNumber },
            data: {
              currentOfficeId: resolvedOfficeId,
              status: "Received",
              currentStatus: "Document In Hand",
              returnOfficeId: bundle.fromOfficeId || undefined,
              fromOfficeId: bundle.fromOfficeId || undefined,
              receivedBy: params.userName || params.userId,
              receivedAt: new Date(),
            },
          });

          if (reg) {
            await tx.documentWorkflowHistory.create({
              data: {
                documentId: reg.id,
                trackingNumber: item.trackingNumber,
                workflowStep: "Bundle Receive",
                status: "Received",
                performedBy: params.userName || params.userId,
                remarks: `Received into Document In Hand from Bundle ${bundle.bundleNumber}`,
                ownerAdminId: params.ownerAdminId,
              },
            });

            await tx.movementHistory.create({
              data: {
                trackingNumber: item.trackingNumber,
                action: "Bundle Receive",
                oldStatus: "Pending Receive",
                newStatus: "Document In Hand",
                oldOffice: bundle.fromOffice?.officeName || null,
                newOffice: receivingOfficeName,
                performedBy: params.userName || params.userId,
                remarks: `Received from Bundle ${bundle.bundleNumber}`,
              },
            });
          }
        }
      }
    }

    const receivedCount = selectedSet.size;
    const isFullReceive = receivedCount >= totalItems;

    if (isFullReceive) {
      await tx.bundle.update({
        where: { id: params.bundleId },
        data: { status: "Received" },
      });
    } else {
      // Partial receive: Remaining unreceived items stay in bundle or create a new bundle
      await tx.bundle.update({
        where: { id: params.bundleId },
        data: { status: "Partially Received" },
      });
    }

    return {
      success: true,
      receivedCount,
      isFullReceive,
    };
  }, { maxWait: 20000, timeout: 60000 });
}

/**
 * WORKSPACE: Transfer selected documents from Document In Hand to Sub Package
 */
export async function transferToSubPackage(params: {
  items: Array<{ trackingNumber: string; subPackageId: string }>;
  officeId: string;
  userId: string;
  userName?: string;
  ownerAdminId: string;
}) {
  return prisma.$transaction(async (tx: any) => {
    let targetOffice = await tx.officeLocation.findFirst({
      where: { OR: [{ id: params.officeId }, { officeName: params.officeId }] },
    });

    if (!targetOffice) {
      const ao = await tx.assignedOffice.findUnique({ where: { id: params.officeId } });
      if (ao) {
        targetOffice = await tx.officeLocation.findFirst({
          where: { officeName: ao.username, ownerAdminId: params.ownerAdminId },
        });
        if (!targetOffice) {
          targetOffice = await tx.officeLocation.create({
            data: {
              id: params.officeId,
              officeName: ao.username,
              location: "External Processing Office",
              timezone: "UTC",
              isProcessOffice: true,
              ownerAdminId: params.ownerAdminId,
            },
          });
        }
      }
    }

    const resolvedOfficeId = targetOffice?.id || params.officeId;

    for (const item of params.items) {
      const reg = await tx.registration.findUnique({
        where: { trackingNumber: item.trackingNumber },
      });

      if (!reg) continue;

      // Create sub package movement record
      await tx.subPackageMovement.create({
        data: {
          documentId: reg.id,
          trackingNumber: item.trackingNumber,
          subPackageId: item.subPackageId,
          assignedOfficeId: resolvedOfficeId,
          status: "In Progress",
          createdBy: params.userName || params.userId,
          ownerAdminId: params.ownerAdminId,
        },
      });

      // Update DocumentMovement to reflect the transfer out of Document In Hand.
      // Setting currentStatus = "In Sub Package" causes the in_hand query to
      // exclude this document immediately after a successful transfer.
      await tx.documentMovement.updateMany({
        where: {
          trackingNumber: item.trackingNumber,
        },
        data: {
          currentStatus: "In Sub Package",
        },
      });

      await tx.documentWorkflowHistory.create({
        data: {
          documentId: reg.id,
          trackingNumber: item.trackingNumber,
          workflowStep: "Sub Package Transfer",
          status: "In Progress",
          performedBy: params.userName || params.userId,
          remarks: `Assigned to Sub Package ID: ${item.subPackageId}`,
          ownerAdminId: params.ownerAdminId,
        },
      });

      await tx.auditTrail.create({
        data: {
          registrationId: reg.id,
          action: "SUB_PACKAGE_TRANSFER",
          performedBy: params.userName || params.userId,
          description: `Transferred to Sub Package ID ${item.subPackageId}`,
        },
      });
    }

    return { success: true, count: params.items.length };
  }, { maxWait: 20000, timeout: 60000 });
}

/**
 * WORKSPACE: List Sub Package View items & assigned subpackages for the current office
 */
export async function listSubPackageItemsForOffice(params: {
  officeId: string;
  ownerAdminId: string;
}) {
  if (!params.officeId) {
    return { coreSubPackageId: null, assignedSubPackages: [], subPackages: [], items: [] };
  }

  const { allOfficeIds } = await resolveOfficeIdentifiers(params.officeId, params.ownerAdminId);

  // 1. Fetch office assigned subpackages configuration for this specific office ONLY
  const officeSubPackages = await (prisma as any).assignedOfficeSubPackage.findMany({
    where: { assignedOfficeId: { in: allOfficeIds } },
  });

  const configSubPkgIds: string[] = officeSubPackages.map((sp: any) => sp.subPackageId as string);
  const coreItem = officeSubPackages.find((sp: any) => sp.isCorePackage);

  // Early return: if no sub-packages are assigned to this office, return empty workspace
  if (configSubPkgIds.length === 0) {
    return { coreSubPackageId: null, assignedSubPackages: [], subPackages: [], items: [] };
  }

  // 2. Fetch ONLY active subpackages explicitly assigned to this office (strictly bounded by configSubPkgIds)
  const assignedSubPackages = await prisma.subPackage.findMany({
    where: { id: { in: configSubPkgIds }, isActive: true },
    orderBy: { name: "asc" },
  });

  const validSubPkgIds = assignedSubPackages.map((sp) => sp.id);

  if (validSubPkgIds.length === 0) {
    return { coreSubPackageId: null, assignedSubPackages: [], subPackages: [], items: [] };
  }

  // 3. Fetch subpackage movements ONLY for this office and ONLY for assigned active subpackages
  //    Both filters are required: assignedOfficeId guards per-office security,
  //    subPackageId ensures only active assigned sub-processes are visible.
  const movements = await (prisma as any).subPackageMovement.findMany({
    where: {
      assignedOfficeId: { in: allOfficeIds },
      ownerAdminId: params.ownerAdminId,
      subPackageId: { in: validSubPkgIds },
    },
    orderBy: { startedAt: "desc" },
  });

  const trackingNumbers = Array.from(new Set(movements.map((m: any) => m.trackingNumber))) as string[];
  const registrations = trackingNumbers.length > 0
    ? await prisma.registration.findMany({
        where: { trackingNumber: { in: trackingNumbers } },
      })
    : [];

  const regMap = new Map(registrations.map((r: any) => [r.trackingNumber, r]));

  const formattedAssignedSubPackages = assignedSubPackages.map((sp: any) => ({
    ...sp,
    isCorePackage: sp.id === coreItem?.subPackageId,
  }));

  return {
    coreSubPackageId: coreItem ? coreItem.subPackageId : null,
    assignedSubPackages: formattedAssignedSubPackages,
    subPackages: formattedAssignedSubPackages,
    items: movements.map((m: any) => ({
      ...m,
      registration: regMap.get(m.trackingNumber) || null,
    })),
  };
}

/**
 * WORKSPACE: Process Action on Sub Package Document (Complete, Return, Reject)
 */
export async function processSubPackageDocumentAction(params: {
  movementIds: string[];
  action: "complete" | "return" | "reject";
  userId: string;
  userName?: string;
  ownerAdminId: string;
  officeId?: string;
  remarks?: string;
}) {
  const rejectionReason = params.remarks?.trim();
  if (params.action === "reject" && !rejectionReason) {
    throw new Error("Rejection reason is required.");
  }

  return prisma.$transaction(async (tx: any) => {
    const office = params.officeId ? await tx.officeLocation.findFirst({
      where: { OR: [{ id: params.officeId }, { officeName: params.officeId }] },
      select: { officeName: true },
    }) : null;
    const currentOfficeName = office?.officeName || "Assigned Office";

    for (const movementId of params.movementIds) {
      const subMov = await tx.subPackageMovement.findUnique({
        where: { id: movementId },
      });

      if (!subMov) continue;

      const reg = await tx.registration.findUnique({
        where: { trackingNumber: subMov.trackingNumber },
      });

      if (!reg) continue;

      if (params.action === "complete") {
        await tx.subPackageMovement.update({
          where: { id: movementId },
          data: {
            status: "Completed",
            completedAt: new Date(),
          },
        });

        // Move document automatically to Document Complete
        await tx.documentMovement.updateMany({
          where: {
            trackingNumber: subMov.trackingNumber,
            currentOfficeId: subMov.assignedOfficeId || params.officeId,
          },
          data: { currentStatus: "Completed" },
        });

        await tx.documentWorkflowHistory.create({
          data: {
            documentId: reg.id,
            trackingNumber: subMov.trackingNumber,
            workflowStep: "Sub Package Completed",
            status: "Completed",
            performedBy: params.userName || params.userId,
            remarks: params.remarks || "Sub Package processing completed",
            ownerAdminId: params.ownerAdminId,
          },
        });

        await tx.movementHistory.create({
          data: {
            trackingNumber: subMov.trackingNumber,
            action: "Sub Package Completed",
            oldStatus: "In Sub Package",
            newStatus: "Completed",
            oldOffice: currentOfficeName,
            newOffice: currentOfficeName,
            performedBy: params.userName || params.userId,
            remarks: params.remarks || "Sub Package processing completed",
          },
        });

        await tx.auditTrail.create({
          data: {
            registrationId: reg.id,
            action: "SUB_PACKAGE_COMPLETED",
            performedBy: params.userName || params.userId,
            description: `Subpackage completed for tracking #${subMov.trackingNumber}`,
          },
        });
      } else if (params.action === "return") {
        await tx.subPackageMovement.update({
          where: { id: movementId },
          data: {
            status: "Returned",
            returnedAt: new Date(),
          },
        });

        await tx.documentMovement.updateMany({
          where: {
            trackingNumber: subMov.trackingNumber,
            currentOfficeId: subMov.assignedOfficeId || params.officeId,
          },
          data: { currentStatus: "Returned" },
        });

        await tx.documentWorkflowHistory.create({
          data: {
            documentId: reg.id,
            trackingNumber: subMov.trackingNumber,
            workflowStep: "Sub Package Return",
            status: "Returned",
            performedBy: params.userName || params.userId,
            remarks: params.remarks || "Returned during sub package processing",
            ownerAdminId: params.ownerAdminId,
          },
        });

        await tx.movementHistory.create({
          data: {
            trackingNumber: subMov.trackingNumber,
            action: "Sub Package Return",
            oldStatus: "In Sub Package",
            newStatus: "Returned",
            oldOffice: currentOfficeName,
            newOffice: currentOfficeName,
            performedBy: params.userName || params.userId,
            remarks: params.remarks || "Returned during sub package processing",
          },
        });

        await tx.auditTrail.create({
          data: {
            registrationId: reg.id,
            action: "SUB_PACKAGE_RETURNED",
            performedBy: params.userName || params.userId,
            description: `Subpackage returned for tracking #${subMov.trackingNumber}`,
          },
        });
      } else if (params.action === "reject") {
        await tx.subPackageMovement.update({
          where: { id: movementId },
          data: {
            status: "Rejected",
            rejectedAt: new Date(),
            rejectedBy: params.userName || params.userId,
            rejectionReason,
          },
        });

        await tx.documentMovement.updateMany({
          where: {
            trackingNumber: subMov.trackingNumber,
            currentOfficeId: subMov.assignedOfficeId || params.officeId,
          },
          data: { currentStatus: "Rejected" },
        });

        await tx.documentWorkflowHistory.create({
          data: {
            documentId: reg.id,
            trackingNumber: subMov.trackingNumber,
            workflowStep: "Activity Rejected",
            status: "Rejected",
            performedBy: params.userName || params.userId,
            remarks: rejectionReason,
            ownerAdminId: params.ownerAdminId,
          },
        });

        await tx.movementHistory.create({
          data: {
            trackingNumber: subMov.trackingNumber,
            action: "Sub Package Rejected",
            oldStatus: "In Sub Package",
            newStatus: "Rejected",
            oldOffice: currentOfficeName,
            newOffice: currentOfficeName,
            performedBy: params.userName || params.userId,
            remarks: rejectionReason,
          },
        });

        await tx.auditTrail.create({
          data: {
            registrationId: reg.id,
            action: "SUB_PACKAGE_REJECTED",
            performedBy: params.userName || params.userId,
            description: `Activity rejected for tracking #${subMov.trackingNumber}. Reason: ${rejectionReason}`,
          },
        });
      }
    }

    return { success: true };
  }, { maxWait: 20000, timeout: 60000 });
}

/**
 * WORKSPACE: Move documents back into Document In Hand
 */
export async function sendDocumentsToInHand(params: {
  trackingNumbers: string[];
  officeId: string;
  userId: string;
  userName?: string;
  ownerAdminId: string;
}) {
  return prisma.$transaction(async (tx: any) => {
    for (const trackingNumber of params.trackingNumbers) {
      const reg = await tx.registration.findUnique({
        where: { trackingNumber },
      });

      if (!reg) continue;

      await tx.documentMovement.updateMany({
        where: {
          trackingNumber,
        },
        data: {
          currentStatus: "Document In Hand",
        },
      });

      await tx.documentWorkflowHistory.create({
        data: {
          documentId: reg.id,
          trackingNumber,
          workflowStep: "Sent To In Hand",
          status: "Document In Hand",
          performedBy: params.userName || params.userId,
          remarks: "Moved back into Document In Hand",
          ownerAdminId: params.ownerAdminId,
        },
      });

      await tx.auditTrail.create({
        data: {
          registrationId: reg.id,
          action: "SENT_TO_IN_HAND",
          performedBy: params.userName || params.userId,
          description: `Document #${trackingNumber} moved back into Document In Hand`,
        },
      });
    }

    return { success: true, count: params.trackingNumbers.length };
  }, { maxWait: 20000, timeout: 60000 });
}

/**
 * Helper to query and validate authorized Process Module recipients for an Assigned Office.
 * A user is an authorized Process recipient if:
 * 1. User belongs to the same workspace/tenant (ownerAdminId).
 * 2. User is active (isActive = true, isLocked = false).
 * 3. User has Process Module access (process.view, process.inbound.view, etc. or Super Admin).
 * 4. User has Process Module Office Visibility enabled for the Assigned Office (or is Super Admin).
 */
export async function getAuthorizedProcessRecipientsForAssignedOffice(params: {
  assignedOfficeLocIds: string[];
  ownerAdminId: string;
  tx?: any;
}) {
  const client = params.tx || prisma;
  const candidateUsers = await client.user.findMany({
    where: {
      OR: [
        { ownerAdminId: params.ownerAdminId },
        { id: params.ownerAdminId },
      ],
      isActive: true,
      isLocked: false,
    },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
      userPermissions: true,
      officeVisibilities: {
        where: { moduleKey: "process" },
        include: { officeLocation: true },
      },
    },
  });

  const authorizedUsers: Array<{
    id: string;
    name: string | null;
    email: string;
    isSuperAdmin: boolean;
    officeLocationId?: string | null;
    officeLocationName?: string | null;
  }> = [];

  for (const user of candidateUsers) {
    const isSuperAdmin = Boolean(
      user.role?.name === "Super Admin" ||
      (!user.ownerAdminId || user.ownerAdminId === user.id)
    );

    // 1. Check Process Module Permissions
    let hasProcessPermission = false;
    const explicitPerms = (user.userPermissions || []).map((up: any) => up.permissionKey);
    
    if (isSuperAdmin) {
      hasProcessPermission = true;
    } else if (explicitPerms.length > 0) {
      hasProcessPermission = explicitPerms.some((key: string) =>
        key === "*" ||
        key === "process.view" ||
        key === "process.inbound.view" ||
        key === "process.inbound.receive" ||
        key === "process.receive" ||
        key === "menu.process"
      );
    } else if (user.role?.rolePermissions) {
      const rolePermCodes = user.role.rolePermissions.map((rp: any) => rp.permission?.code);
      hasProcessPermission = rolePermCodes.some((code: string) =>
        code === "*" ||
        code === "process.view" ||
        code === "process.inbound.view" ||
        code === "process.inbound.receive" ||
        code === "process.receive" ||
        code === "menu.process"
      );
    }

    if (!hasProcessPermission) {
      continue;
    }

    // 2. Check Process Module Office Visibility for this Assigned Office
    const hasOfficeVisibility = (user.officeVisibilities || []).some((ov: any) =>
      params.assignedOfficeLocIds.includes(ov.officeLocationId)
    );

    if (hasOfficeVisibility) {
      authorizedUsers.push({
        id: user.id,
        name: user.name,
        email: user.email,
        isSuperAdmin: isSuperAdmin,
        officeLocationId: user.officeLocationId,
        officeLocationName: user.officeLocationName,
      });
    }
  }

  // Sort so non-superadmin users with explicit role/office visibility take precedence over workspace owner
  authorizedUsers.sort((a, b) => (a.isSuperAdmin === b.isSuperAdmin ? 0 : a.isSuperAdmin ? 1 : -1));

  return authorizedUsers;
}

/**
 * WORKSPACE: Transfer documents back to Process Module
 * Resolves destination strictly according to:
 * Admin Management -> Roles -> Office Visibility Access -> Process Module -> Assigned Office
 * + User Authorization & Process Module permissions.
 */
export async function transferBackToProcess(params: {
  trackingNumbers: string[];
  officeId: string;
  userId: string;
  userName?: string;
  ownerAdminId: string;
  bundleId?: string;
  remarks?: string;
}) {
  if (!params.trackingNumbers || params.trackingNumbers.length === 0) {
    return { success: true, count: 0, bundleNumbers: [] };
  }

  const db = prisma as any;

  // 1. Resolve Assigned Office identifiers & Office Location
  const office = db.assignedOffice
    ? await db.assignedOffice.findUnique({
        where: { id: params.officeId },
      })
    : null;

  let sourceOffice = await prisma.officeLocation.findFirst({
    where: {
      OR: [
        { id: params.officeId },
        ...(office?.username ? [{ officeName: office.username }] : []),
      ],
    },
  });

  if (!office && !sourceOffice) {
    throw new Error(`Assigned office not found for ID: ${params.officeId}`);
  }

  const officeName = office ? office.username : sourceOffice!.officeName;

  if (!sourceOffice) {
    sourceOffice = await prisma.officeLocation.create({
      data: {
        id: params.officeId,
        officeName: officeName,
        location: "External Processing Office",
        timezone: "UTC",
        isProcessOffice: true,
        ownerAdminId: params.ownerAdminId,
      },
    });
  }

  const officeInfo = await resolveOfficeIdentifiers(params.officeId, params.ownerAdminId);
  const allAssignedOfficeLocs = await prisma.officeLocation.findMany({
    where: {
      OR: [
        { id: params.officeId },
        { officeName: officeName },
        ...(office?.username ? [{ officeName: office.username }] : []),
      ],
    },
  });
  const assignedOfficeLocIds = Array.from(
    new Set([
      params.officeId,
      sourceOffice.id,
      ...allAssignedOfficeLocs.map((l: any) => l.id),
      ...officeInfo.allOfficeIds,
    ])
  );
  const assignedOfficeNames = Array.from(
    new Set([officeName, sourceOffice.officeName, ...(office?.username ? [office.username] : [])])
  );

  // 2. Query authorized Process recipients via RBAC Office Visibility & Module Permissions
  const authorizedProcessUsers = await getAuthorizedProcessRecipientsForAssignedOffice({
    assignedOfficeLocIds,
    ownerAdminId: params.ownerAdminId,
  });

  if (authorizedProcessUsers.length === 0) {
    throw new Error("No authorized Process user is configured for this Assigned Office.");
  }

  const primaryRecipient = authorizedProcessUsers[0];
  const recipientNames = authorizedProcessUsers.map((u) => u.name || u.email).join(", ");
  const primaryRecipientId = primaryRecipient.id;

  return prisma.$transaction(async (tx: any) => {
    // 3. Validate selected documents & check idempotency
    const validTrackingNumbers: string[] = [];
    const now = new Date();

    for (const tNum of params.trackingNumbers) {
      const reg = await tx.registration.findFirst({
        where: { trackingNumber: tNum, ownerAdminId: params.ownerAdminId },
      });

      if (!reg) {
        throw new Error(`Document ${tNum} does not belong to this tenant.`);
      }

      const docMov = await tx.documentMovement.findFirst({
        where: { trackingNumber: tNum },
      });

      if (!docMov) {
        throw new Error(`Movement record not found for document ${tNum}.`);
      }

      const isCurrentInAssignedOffice =
        (docMov.currentOfficeId && assignedOfficeLocIds.includes(docMov.currentOfficeId)) ||
        (docMov.toOfficeId && assignedOfficeLocIds.includes(docMov.toOfficeId));

      if (!isCurrentInAssignedOffice) {
        throw new Error(`Document ${tNum} is not currently in the ${officeName} workspace.`);
      }

      // Check for duplicate pending return
      const isAlreadyPendingReturn =
        docMov.currentModule === "PROCESS_MODULE" &&
        docMov.status === "INBOUND" &&
        docMov.currentStatus === "Pending Receive";

      if (isAlreadyPendingReturn) {
        // Already returned and pending receive in Process
        continue;
      }

      validTrackingNumbers.push(tNum);
    }

    if (validTrackingNumbers.length === 0) {
      // All selected documents are already in pending receive state
      return {
        success: true,
        count: 0,
        bundleNumbers: [],
        message: "Documents are already transferred back to Process Module.",
      };
    }

    // 4. Resolve DESTINATION Process Office
    // Must be a valid Process / Branch Office Location, and NEVER the source Assigned Office!
    let destinationOffice: any = null;

    if (primaryRecipient.officeLocationId && !assignedOfficeLocIds.includes(primaryRecipient.officeLocationId)) {
      destinationOffice = await tx.officeLocation.findFirst({
        where: { id: primaryRecipient.officeLocationId },
      });
    }

    if (!destinationOffice) {
      // Check document's originalProcessOfficeId or originOfficeId
      const sampleMov = await tx.documentMovement.findFirst({
        where: { trackingNumber: validTrackingNumbers[0] },
      });
      const candidateDocOfficeId = sampleMov?.originalProcessOfficeId || sampleMov?.originOfficeId;
      if (candidateDocOfficeId && !assignedOfficeLocIds.includes(candidateDocOfficeId)) {
        destinationOffice = await tx.officeLocation.findFirst({
          where: { id: candidateDocOfficeId },
        });
      }
    }

    if (!destinationOffice) {
      // Find any non-assigned process/branch office in the tenant
      destinationOffice = await tx.officeLocation.findFirst({
        where: {
          ownerAdminId: params.ownerAdminId,
          id: { notIn: assignedOfficeLocIds },
        },
      });
    }

    if (!destinationOffice) {
      // Fallback: create or retrieve a dedicated Process Operations office for the tenant
      destinationOffice = await tx.officeLocation.findFirst({
        where: {
          ownerAdminId: params.ownerAdminId,
          officeName: "Process Operations",
        },
      });
      if (!destinationOffice) {
        destinationOffice = await tx.officeLocation.create({
          data: {
            officeName: "Process Operations",
            location: "Central Operations",
            timezone: "Asia/Kolkata",
            isProcessOffice: true,
            ownerAdminId: params.ownerAdminId,
          },
        });
      }
    }

    const destinationOfficeId = destinationOffice.id;
    const destinationOfficeName = destinationOffice.officeName;

    // 5. Create / Update Process Return Bundle
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const bundleNumber = `BND-PROC-${dateStr}-${randomSuffix}-${randomHex}`;

    let groupBundle: any = null;

    if (params.bundleId) {
      const found = await tx.bundle.findUnique({
        where: { id: params.bundleId },
      });
      if (found && found.status === "Pending Receive") {
        groupBundle = found;
      }
    }

    if (groupBundle) {
      await tx.bundle.update({
        where: { id: groupBundle.id },
        data: {
          fromOfficeId: sourceOffice.id,
          toOfficeId: destinationOfficeId,
          status: "Pending Receive",
          updatedAt: now,
        },
      });

      for (const tNum of validTrackingNumbers) {
        const existingItem = await tx.bundleItem.findFirst({
          where: { bundleId: groupBundle.id, trackingNumber: tNum },
        });
        if (existingItem) {
          await tx.bundleItem.update({
            where: { id: existingItem.id },
            data: { status: "Pending Receive" },
          });
        } else {
          await tx.bundleItem.create({
            data: {
              bundleId: groupBundle.id,
              trackingNumber: tNum,
              status: "Pending Receive",
            },
          });
        }
      }
    } else {
      groupBundle = await tx.bundle.create({
        data: {
          bundleNumber,
          fromOfficeId: sourceOffice.id,
          toOfficeId: destinationOfficeId,
          status: "Pending Receive",
          createdBy: params.userName || params.userId,
          ownerAdminId: params.ownerAdminId,
          items: {
            create: validTrackingNumbers.map((tNum) => ({
              trackingNumber: tNum,
              status: "Pending Receive",
            })),
          },
        },
      });
    }

    // 6. Clean up any in-progress SubPackage movements for these tracking numbers
    if (tx.subPackageMovement) {
      await tx.subPackageMovement.updateMany({
        where: {
          trackingNumber: { in: validTrackingNumbers },
          status: "In Progress",
        },
        data: {
          status: "Returned",
          returnedAt: now,
        },
      });
    }

    // 7. Update Document Movements, Registrations, Workflow History, Audit Trail, and Movement History
    for (const tNum of validTrackingNumbers) {
      const reg = await tx.registration.findUnique({ where: { trackingNumber: tNum } });
      const docMov = await tx.documentMovement.findFirst({ where: { trackingNumber: tNum } });
      const previousStatus = docMov?.currentStatus || docMov?.status || "Document In Hand";

      await tx.documentMovement.updateMany({
        where: { trackingNumber: tNum },
        data: {
          fromModule: "ASSIGNED_OFFICE",
          toModule: "PROCESS_MODULE",
          currentModule: "PROCESS_MODULE",
          fromOfficeId: sourceOffice.id,
          toOfficeId: destinationOfficeId,
          currentOfficeId: sourceOffice.id,
          status: "INBOUND",
          currentStatus: "Pending Receive",
          movementType: "BACK_TO_PROCESS",
          bundleId: groupBundle.id,
          sentAt: now,
          acceptedBy: primaryRecipientId || null,
          remarks: (
            params.remarks ||
            `Transferred back to Process Module (${destinationOfficeName}) via Bundle ${groupBundle.bundleNumber}`
          ).slice(0, 190),
        } as any,
      });

      if (reg) {
        await tx.registration.update({
          where: { trackingNumber: tNum },
          data: {
            trackingStatus: "In Transfer",
            bmStatus: "Transferred",
          },
        });

        if (tx.documentWorkflowHistory) {
          const workflowRemarks = (
            params.remarks ||
            `Transferred back to Process Office (${destinationOfficeName}) via Bundle ${groupBundle.bundleNumber} (Authorized: ${recipientNames})`
          ).slice(0, 190);

          await tx.documentWorkflowHistory.create({
            data: {
              documentId: reg.id,
              trackingNumber: tNum,
              workflowStep: "Back To Process Transfer",
              status: "Pending Receive",
              performedBy: params.userName || params.userId,
              remarks: workflowRemarks,
              ownerAdminId: params.ownerAdminId,
            },
          });
        }

        if (tx.auditTrail) {
          const auditDesc = (
            `Document returned from ${officeName} to Process Module (${destinationOfficeName}) for authorized user(s): ${recipientNames}.`
          ).slice(0, 190);

          await tx.auditTrail.create({
            data: {
              registrationId: reg.id,
              action: "Transferred Back to Process",
              performedBy: params.userName || params.userId,
              description: auditDesc,
            },
          });
        }

        const movementRemarks = (
          params.remarks ||
          `Returned from ${officeName} to Process Module (${destinationOfficeName}) for authorized user(s): ${recipientNames}.`
        ).slice(0, 190);

        await tx.movementHistory.create({
          data: {
            trackingNumber: tNum,
            action: "Back To Process",
            oldStatus: previousStatus,
            newStatus: "Pending Receive",
            oldOffice: officeName.slice(0, 190),
            newOffice: destinationOfficeName.slice(0, 190),
            performedBy: params.userName || params.userId,
            remarks: movementRemarks,
          },
        });
      }
    }

    return {
      success: true,
      bundleNumbers: [groupBundle.bundleNumber],
      bundleId: groupBundle.id,
      count: validTrackingNumbers.length,
      destinationOffice: destinationOfficeName,
      authorizedRecipients: recipientNames,
    };
  }, { maxWait: 20000, timeout: 60000 });
}
