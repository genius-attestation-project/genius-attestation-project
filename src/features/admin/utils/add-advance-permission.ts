export interface AddAdvanceUserAccess {
  isSuperAdmin?: boolean;
  permissions?: string[];
  moduleOfficeVisibilities?: Record<string, { officeIds: string[]; officeNames?: string[] }> | null;
}

export interface AddAdvanceDocumentTarget {
  regionOfRegistrationId?: string | null;
  regionOfRegistration?: string | null;
}

/**
 * Evaluates whether a user is authorized to perform "Add Advance" on a given document.
 *
 * Rules:
 * 1. Super Admin bypasses all checks.
 * 2. User must have the "revenue_registration.add_advance" action permission (or "*").
 * 3. User must have at least one office configured under "revenue_registration_add_advance"
 *    (secure default: DENY if empty).
 * 4. Document's regionOfRegistrationId must match one of the configured Add Advance office IDs.
 *    (Fallback: regionOfRegistration name matching if ID is absent).
 *    (No current office matching, no delivery location matching, exact matching only).
 */
export function canUserAddAdvance(
  access: AddAdvanceUserAccess | null | undefined,
  document: AddAdvanceDocumentTarget | null | undefined,
): boolean {
  if (!access) return false;
  if (access.isSuperAdmin) return true;

  // 1. Check role/action permission
  const permissions = Array.isArray(access.permissions) ? access.permissions : [];
  const hasAddAdvancePermission =
    permissions.includes("revenue_registration.add_advance") || permissions.includes("*");
  if (!hasAddAdvancePermission) return false;

  // 2. Check configured Add Advance offices
  const addAdvanceConfig = access.moduleOfficeVisibilities?.["revenue_registration_add_advance"];
  const configuredOfficeIds = addAdvanceConfig?.officeIds ?? [];
  const configuredOfficeNames = addAdvanceConfig?.officeNames ?? [];
  if (configuredOfficeIds.length === 0 && configuredOfficeNames.length === 0) {
    // If Add Advance = ON but no offices are configured: DENY
    return false;
  }

  // 3. Document regionOfRegistrationId must match one of configured office IDs
  const docRegionId = document?.regionOfRegistrationId?.trim();
  if (docRegionId && configuredOfficeIds.includes(docRegionId)) {
    return true;
  }

  // Fallback: match by regionOfRegistration name if ID is missing
  const docRegionName = document?.regionOfRegistration?.trim().toLowerCase();
  if (docRegionName && configuredOfficeNames.some((n) => n.trim().toLowerCase() === docRegionName)) {
    return true;
  }

  return false;
}
