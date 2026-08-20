import { prisma } from "@/lib/prisma";
import type {
  AccountNode,
  AccountNodeInput,
  AccountNodeSettingsInput,
  AccountMenuAuditLogItem,
} from "../types/account-menu.types";

const db = prisma as any;

/**
 * Ensures default root nodes ("CREDIT" and "DEBIT") exist for an ownerAdminId.
 */
export async function ensureAccountMenuBootstrap(ownerAdminId: string): Promise<void> {
  const existingCount = await db.accountMenu.count({
    where: { ownerAdminId },
  });

  if (existingCount > 0) return;

  // Create default CREDIT & DEBIT root nodes
  await db.accountMenu.createMany({
    data: [
      {
        name: "CREDIT",
        type: "CREDIT",
        category: "Root",
        parentId: null,
        ownerAdminId,
        description: "Root Category for Credit Accounts",
        status: true,
      },
      {
        name: "DEBIT",
        type: "DEBIT",
        category: "Root",
        parentId: null,
        ownerAdminId,
        description: "Root Category for Debit Accounts",
        status: true,
      },
    ],
  });
}

/**
 * Builds a hierarchical tree from a flat list of account nodes.
 */
function buildTree(nodes: any[], parentId: string | null = null): AccountNode[] {
  return nodes
    .filter((node) => node.parentId === parentId)
    .map((node) => {
      const children = buildTree(nodes, node.id);
      return {
        id: node.id,
        name: node.name,
        type: node.type,
        parentId: node.parentId,
        category: node.category,
        code: node.code,
        ledgerMapping: node.ledgerMapping,
        description: node.description,
        status: node.status,
        settings: node.settings as any,
        ownerAdminId: node.ownerAdminId,
        createdBy: node.createdBy,
        createdByName: node.createdByName,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
        children,
        childCount: children.length,
        isLeaf: children.length === 0,
      };
    });
}

/**
 * Fetches the entire account menu tree for an ownerAdmin.
 */
export async function getAccountTree(ownerAdminId: string): Promise<AccountNode[]> {
  await ensureAccountMenuBootstrap(ownerAdminId);

  const rawNodes = await db.accountMenu.findMany({
    where: { ownerAdminId },
    orderBy: [{ createdAt: "asc" }, { name: "asc" }],
  });

  return buildTree(rawNodes, null);
}

/**
 * Creates a new account menu node under a parent.
 */
export async function createAccountNode(
  ownerAdminId: string,
  userId: string | undefined,
  userName: string | undefined,
  data: AccountNodeInput
): Promise<AccountNode> {
  const { name, parentId, category, description, code, ledgerMapping, status } = data;

  // Duplicate name check under same parent
  const existingSameName = await db.accountMenu.findFirst({
    where: {
      name,
      parentId: parentId || null,
      ownerAdminId,
    },
  });

  if (existingSameName) {
    throw new Error("An account node with this name already exists under this parent.");
  }

  let inheritedType: string | null = null;
  if (parentId) {
    const parentNode = await db.accountMenu.findUnique({
      where: { id: parentId },
    });
    if (!parentNode || parentNode.ownerAdminId !== ownerAdminId) {
      throw new Error("Parent node not found.");
    }
    inheritedType = parentNode.type;
  } else if (name === "CREDIT" || name === "DEBIT") {
    inheritedType = name;
  }

  const newNode = await db.accountMenu.create({
    data: {
      name,
      type: inheritedType,
      parentId: parentId || null,
      category: category || (parentId ? "Sub Node" : "Root"),
      description,
      code,
      ledgerMapping,
      status: status ?? true,
      ownerAdminId,
      createdBy: userId,
      createdByName: userName,
    },
  });

  // Audit log creation
  await db.accountMenuAuditLog.create({
    data: {
      accountMenuId: newNode.id,
      nodeName: newNode.name,
      action: "CREATE",
      newValue: {
        id: newNode.id,
        name: newNode.name,
        parentId: newNode.parentId,
        type: newNode.type,
        category: newNode.category,
      },
      performedBy: userId,
      performedByName: userName,
      ownerAdminId,
    },
  });

  return {
    id: newNode.id,
    name: newNode.name,
    type: newNode.type,
    parentId: newNode.parentId,
    category: newNode.category,
    code: newNode.code,
    ledgerMapping: newNode.ledgerMapping,
    description: newNode.description,
    status: newNode.status,
    settings: newNode.settings as any,
    ownerAdminId: newNode.ownerAdminId,
    createdBy: newNode.createdBy,
    createdByName: newNode.createdByName,
    createdAt: newNode.createdAt,
    updatedAt: newNode.updatedAt,
    children: [],
    childCount: 0,
    isLeaf: true,
  };
}

/**
 * Updates an account menu node's basic info.
 */
export async function updateAccountNode(
  ownerAdminId: string,
  userId: string | undefined,
  userName: string | undefined,
  nodeId: string,
  data: Partial<AccountNodeInput>
): Promise<AccountNode> {
  const existing = await db.accountMenu.findFirst({
    where: { id: nodeId, ownerAdminId },
  });

  if (!existing) {
    throw new Error("Account node not found.");
  }

  // Prevent renaming default root nodes if invalid
  if ((existing.name === "CREDIT" || existing.name === "DEBIT") && !existing.parentId) {
    if (data.name && data.name !== existing.name) {
      throw new Error("Root categories (CREDIT / DEBIT) cannot be renamed.");
    }
  }

  // Check duplicate name under same parent if name is changing
  if (data.name && data.name !== existing.name) {
    const duplicate = await db.accountMenu.findFirst({
      where: {
        name: data.name,
        parentId: existing.parentId,
        ownerAdminId,
        NOT: { id: nodeId },
      },
    });

    if (duplicate) {
      throw new Error("An account node with this name already exists under this parent.");
    }
  }

  const updatedNode = await db.accountMenu.update({
    where: { id: nodeId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.code !== undefined && { code: data.code }),
      ...(data.ledgerMapping !== undefined && { ledgerMapping: data.ledgerMapping }),
    },
  });

  // Audit log
  await db.accountMenuAuditLog.create({
    data: {
      accountMenuId: updatedNode.id,
      nodeName: updatedNode.name,
      action: "UPDATE",
      oldValue: {
        name: existing.name,
        description: existing.description,
        status: existing.status,
        code: existing.code,
        ledgerMapping: existing.ledgerMapping,
      },
      newValue: {
        name: updatedNode.name,
        description: updatedNode.description,
        status: updatedNode.status,
        code: updatedNode.code,
        ledgerMapping: updatedNode.ledgerMapping,
      },
      performedBy: userId,
      performedByName: userName,
      ownerAdminId,
    },
  });

  const childCount = await db.accountMenu.count({
    where: { parentId: nodeId },
  });

  return {
    id: updatedNode.id,
    name: updatedNode.name,
    type: updatedNode.type,
    parentId: updatedNode.parentId,
    category: updatedNode.category,
    code: updatedNode.code,
    ledgerMapping: updatedNode.ledgerMapping,
    description: updatedNode.description,
    status: updatedNode.status,
    settings: updatedNode.settings as any,
    ownerAdminId: updatedNode.ownerAdminId,
    createdBy: updatedNode.createdBy,
    createdByName: updatedNode.createdByName,
    createdAt: updatedNode.createdAt,
    updatedAt: updatedNode.updatedAt,
    childCount,
    isLeaf: childCount === 0,
  };
}

/**
 * Deletes an account menu node (verifying it has no children).
 */
export async function deleteAccountNode(
  ownerAdminId: string,
  userId: string | undefined,
  userName: string | undefined,
  nodeId: string
): Promise<void> {
  const existing = await db.accountMenu.findFirst({
    where: { id: nodeId, ownerAdminId },
  });

  if (!existing) {
    throw new Error("Account node not found.");
  }

  // Prevent deleting root CREDIT / DEBIT nodes
  if ((existing.name === "CREDIT" || existing.name === "DEBIT") && !existing.parentId) {
    throw new Error("Root categories (CREDIT / DEBIT) cannot be deleted.");
  }

  // Children check
  const childCount = await db.accountMenu.count({
    where: { parentId: nodeId, ownerAdminId },
  });

  if (childCount > 0) {
    throw new Error(
      `Cannot delete "${existing.name}" because it contains ${childCount} child item(s). Please remove child items first.`
    );
  }

  // Create audit log before delete
  await db.accountMenuAuditLog.create({
    data: {
      accountMenuId: null,
      nodeName: existing.name,
      action: "DELETE",
      oldValue: {
        id: existing.id,
        name: existing.name,
        parentId: existing.parentId,
        type: existing.type,
        category: existing.category,
      },
      performedBy: userId,
      performedByName: userName,
      ownerAdminId,
    },
  });

  await db.accountMenu.delete({
    where: { id: nodeId },
  });
}

/**
 * Updates settings for a leaf account node.
 */
export async function updateAccountNodeSettings(
  ownerAdminId: string,
  userId: string | undefined,
  userName: string | undefined,
  nodeId: string,
  settingsData: AccountNodeSettingsInput
): Promise<AccountNode> {
  const existing = await db.accountMenu.findFirst({
    where: { id: nodeId, ownerAdminId },
  });

  if (!existing) {
    throw new Error("Account node not found.");
  }

  // Check if node is leaf node
  const childCount = await db.accountMenu.count({
    where: { parentId: nodeId, ownerAdminId },
  });

  if (childCount > 0) {
    throw new Error("Settings can only be configured for leaf nodes.");
  }

  const mergedSettings = {
    ...(existing.settings as object || {}),
    accountCode: settingsData.accountCode ?? existing.code,
    ledgerMapping: settingsData.ledgerMapping ?? existing.ledgerMapping,
    description: settingsData.description ?? existing.description,
    status: settingsData.status ?? existing.status,
    ...(settingsData.customSettings || {}),
  };

  const updatedNode = await db.accountMenu.update({
    where: { id: nodeId },
    data: {
      code: settingsData.accountCode !== undefined ? settingsData.accountCode : existing.code,
      ledgerMapping: settingsData.ledgerMapping !== undefined ? settingsData.ledgerMapping : existing.ledgerMapping,
      description: settingsData.description !== undefined ? settingsData.description : existing.description,
      status: settingsData.status !== undefined ? settingsData.status : existing.status,
      settings: mergedSettings,
    },
  });

  // Audit log
  await db.accountMenuAuditLog.create({
    data: {
      accountMenuId: updatedNode.id,
      nodeName: updatedNode.name,
      action: "SETTINGS_UPDATE",
      oldValue: {
        code: existing.code,
        ledgerMapping: existing.ledgerMapping,
        settings: existing.settings,
      },
      newValue: {
        code: updatedNode.code,
        ledgerMapping: updatedNode.ledgerMapping,
        settings: updatedNode.settings,
      },
      performedBy: userId,
      performedByName: userName,
      ownerAdminId,
    },
  });

  return {
    id: updatedNode.id,
    name: updatedNode.name,
    type: updatedNode.type,
    parentId: updatedNode.parentId,
    category: updatedNode.category,
    code: updatedNode.code,
    ledgerMapping: updatedNode.ledgerMapping,
    description: updatedNode.description,
    status: updatedNode.status,
    settings: updatedNode.settings as any,
    ownerAdminId: updatedNode.ownerAdminId,
    createdBy: updatedNode.createdBy,
    createdByName: updatedNode.createdByName,
    createdAt: updatedNode.createdAt,
    updatedAt: updatedNode.updatedAt,
    childCount: 0,
    isLeaf: true,
  };
}

/**
 * Fetches audit logs for a node or ownerAdmin.
 */
export async function getAccountNodeAuditLogs(
  ownerAdminId: string,
  nodeId?: string
): Promise<AccountMenuAuditLogItem[]> {
  const where: any = { ownerAdminId };
  if (nodeId) {
    where.accountMenuId = nodeId;
  }

  const logs = await db.accountMenuAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return logs as AccountMenuAuditLogItem[];
}

/**
 * Fetches all available offices for an ownerAdmin grouped by country / location.
 */
export async function getAvailableOfficesGroupedByCountry(ownerAdminId: string) {
  const officeLocations = await db.officeLocation.findMany({
    where: {
      ownerAdminId,
      isProcessOffice: false,
      NOT: {
        location: "External Processing Office",
      },
    },
    select: {
      id: true,
      officeName: true,
      location: true,
      isProcessOffice: true,
    },
    orderBy: [{ location: "asc" }, { officeName: "asc" }],
  });

  const map = new Map<string, { id: string; name: string; location: string; isProcessOffice: boolean }[]>();

  for (const office of officeLocations) {
    const country = office.location?.trim() || "Other";
    if (country === "External Processing Office") continue;

    if (!map.has(country)) {
      map.set(country, []);
    }
    map.get(country)!.push({
      id: office.id,
      name: office.officeName,
      location: country,
      isProcessOffice: office.isProcessOffice,
    });
  }

  const groups = Array.from(map.entries())
    .filter(([country]) => country !== "External Processing Office")
    .map(([country, offices]) => ({
      country,
      offices,
    }));

  return groups;
}

/**
 * Fetches assigned office IDs for a specific account node.
 */
export async function getAccountOfficeAssignments(ownerAdminId: string, nodeId: string): Promise<string[]> {
  const assignments = await db.accountOfficeAssignment.findMany({
    where: {
      accountNodeId: nodeId,
      ownerAdminId,
    },
    select: {
      officeId: true,
    },
  });

  return assignments.map((a: any) => a.officeId);
}

/**
 * Updates office assignments for a leaf account node.
 */
export async function updateAccountOfficeAssignments(
  ownerAdminId: string,
  userId: string | undefined,
  userName: string | undefined,
  nodeId: string,
  officeIds: string[]
): Promise<void> {
  const existing = await db.accountMenu.findFirst({
    where: { id: nodeId, ownerAdminId },
  });

  if (!existing) {
    throw new Error("Account node not found.");
  }

  // Fetch current assignments for audit log
  const oldAssignments = await db.accountOfficeAssignment.findMany({
    where: { accountNodeId: nodeId, ownerAdminId },
    select: { officeId: true },
  });
  const oldOfficeIds = oldAssignments.map((a: any) => a.officeId);

  // Delete existing assignments for this node
  await db.accountOfficeAssignment.deleteMany({
    where: { accountNodeId: nodeId, ownerAdminId },
  });

  // Create new assignments
  if (officeIds.length > 0) {
    await db.accountOfficeAssignment.createMany({
      data: officeIds.map((officeId) => ({
        accountNodeId: nodeId,
        officeId,
        ownerAdminId,
        createdBy: userId,
      })),
    });
  }

  // Audit log entry
  await db.accountMenuAuditLog.create({
    data: {
      accountMenuId: nodeId,
      nodeName: existing.name,
      action: "OFFICE_ASSIGNMENT_UPDATE",
      oldValue: { officeIds: oldOfficeIds },
      newValue: { officeIds },
      performedBy: userId,
      performedByName: userName,
      ownerAdminId,
    },
  });
}

/**
 * Fetches the account menu tree filtered for a specific office.
 * Implements server-side security: returns only accounts assigned to the given office
 * plus their parent ancestor nodes.
 */
export async function getAssignedAccountTree(
  ownerAdminId: string,
  officeId?: string,
  officeName?: string
): Promise<AccountNode[]> {
  await ensureAccountMenuBootstrap(ownerAdminId);

  // 1. Resolve officeId if officeName is provided
  let targetOfficeId = officeId;
  if (!targetOfficeId && officeName) {
    const matchedOffice = await db.officeLocation.findFirst({
      where: {
        ownerAdminId,
        officeName: { equals: officeName.trim() },
      },
      select: { id: true },
    });
    if (matchedOffice) {
      targetOfficeId = matchedOffice.id;
    }
  }

  // Fetch all active raw nodes
  const rawNodes = await db.accountMenu.findMany({
    where: { ownerAdminId, status: true },
    orderBy: [{ createdAt: "asc" }, { name: "asc" }],
  });

  // If no officeId specified (e.g. unassigned user context), return empty tree
  if (!targetOfficeId) {
    return [];
  }

  // 2. Fetch assigned account node IDs for this office
  const officeAssignments = await db.accountOfficeAssignment.findMany({
    where: {
      officeId: targetOfficeId,
      ownerAdminId,
    },
    select: { accountNodeId: true },
  });

  const assignedNodeIds = new Set<string>(officeAssignments.map((a: any) => a.accountNodeId));

  if (assignedNodeIds.size === 0) {
    return [];
  }

  // 3. Collect assigned nodes and all their ancestor parent node IDs
  const nodeMap = new Map<string, any>(rawNodes.map((node: any) => [node.id, node]));
  const visibleNodeIds = new Set<string>();

  for (const assignedId of assignedNodeIds) {
    let currId: string | null = assignedId;
    while (currId && nodeMap.has(currId)) {
      visibleNodeIds.add(currId);
      const currNode = nodeMap.get(currId);
      currId = currNode.parentId;
    }
  }

  // 4. Prune rawNodes to include only visible nodes
  const prunedNodes = rawNodes.filter((node: any) => visibleNodeIds.has(node.id));

  // 5. Build and return hierarchical tree
  return buildTree(prunedNodes, null);
}

