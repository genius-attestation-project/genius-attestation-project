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
