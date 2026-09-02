import { SessionAccess } from "@/features/admin/types/rbac.types";
import { getPermissionScope } from "@/features/admin/server/rbac.service";

type ScopeConfig = {
  createdByField?: string;
  assignedToField?: string;
  departmentRelation?: string; // e.g., "creator"
  officeRelation?: string;     // e.g., "creator"
  processOfficeField?: string;
};

export function buildDataScopeFilter(user: SessionAccess | any, permissionCode: string, config: ScopeConfig = {}) {
  const scope = getPermissionScope(user, permissionCode);

  if (scope === "All" || user.isSuperAdmin) {
    return {}; // No filter, return all records
  }

  if (scope === "None") {
    // Return a condition that is always false to deny access
    return { id: "none" }; 
  }

  const {
    createdByField = "createdById",
    assignedToField = "assignedUserId",
    departmentRelation = "creator",
    officeRelation = "creator",
  } = config;

  switch (scope) {
    case "Own":
    case "Created":
      return { [createdByField]: user.id };

    case "Assigned":
      if (assignedToField) {
        return { [assignedToField]: user.id };
      }
      return { id: "none" };

    case "Reporting Staff":
      return {
        [departmentRelation]: {
          supervisorUserId: user.id
        }
      };

    case "Department":
      if (user.departmentId) {
        return {
          [departmentRelation]: {
            departmentId: user.departmentId
          }
        };
      }
      return { id: "none" };

    case "Office":
      if (user.officeLocationId) {
        return {
          [officeRelation]: {
            officeLocationId: user.officeLocationId
          }
        };
      }
      return { id: "none" };
      
    case "Process Office":
      // If the model has a specific field for process office or location, use it.
      // Otherwise, filter by the creator's office location being a process office.
      // Assuming user.officeLocationId is the process office they belong to.
      if (user.officeLocationId) {
        if (config.processOfficeField) {
           return { [config.processOfficeField]: user.officeLocationId };
        }
        return {
          [officeRelation]: {
            officeLocationId: user.officeLocationId
          }
        };
      }
      return { id: "none" };

    case "Team":
      // "Team" scope can mean users with the same supervisor
      if (user.supervisorUserId) {
        return {
          [departmentRelation]: {
            supervisorUserId: user.supervisorUserId
          }
        };
      }
      return { id: "none" };

    default:
      return { id: "none" };
  }
}

/**
 * Builds Prisma where condition to enforce user's allowed Office Visibility.
 * Returns empty object {} if user is Super Admin or has full access (allowedOfficeIds === null).
 * Returns { id: "none" } if user has 0 allowed offices assigned.
 */
export function buildOfficeVisibilityWhereInput(
  user: { isSuperAdmin?: boolean; allowedOfficeIds?: string[] | null; allowedOfficeNames?: string[] | null; moduleOfficeVisibilities?: Record<string, { officeIds: string[]; officeNames: string[] }> | null } | any,
  options: {
    officeIdField?: string;
    officeNameField?: string;
    relationOfficeField?: string;
    moduleKey?: string;
  } = {}
) {
  if (!user) return { id: "none" };
  if (user.isSuperAdmin || user.allowedOfficeIds === null || user.allowedOfficeNames === null) {
    return {};
  }

  let allowedIds = Array.isArray(user.allowedOfficeIds) ? user.allowedOfficeIds : [];
  let allowedNames = Array.isArray(user.allowedOfficeNames) ? user.allowedOfficeNames : [];

  if (options.moduleKey && user.moduleOfficeVisibilities?.[options.moduleKey]) {
    const modConfig = user.moduleOfficeVisibilities[options.moduleKey];
    if (modConfig) {
      allowedIds = modConfig.officeIds ?? [];
      allowedNames = modConfig.officeNames ?? [];
    }
  }

  if (allowedIds.length === 0 && allowedNames.length === 0) {
    return { id: "none" };
  }

  const conditions: any[] = [];
  if (options.officeIdField && allowedIds.length > 0) {
    conditions.push({ [options.officeIdField]: { in: allowedIds } });
  }
  if (options.officeNameField && allowedNames.length > 0) {
    conditions.push({ [options.officeNameField]: { in: allowedNames } });
  }
  if (options.relationOfficeField && allowedIds.length > 0) {
    conditions.push({ [options.relationOfficeField]: { officeLocationId: { in: allowedIds } } });
  }

  if (conditions.length === 0) {
    return { id: "none" };
  }

  return conditions.length === 1 ? conditions[0] : { OR: conditions };
}
