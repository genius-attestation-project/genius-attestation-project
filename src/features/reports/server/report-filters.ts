export function buildReportFilters(searchParams: URLSearchParams, ownerAdminId: string) {
  const baseWhere: any = { ownerAdminId };

  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");

  if (fromDate || toDate) {
    baseWhere.createdAt = {};
    if (fromDate) baseWhere.createdAt.gte = new Date(`${fromDate}T00:00:00.000Z`);
    if (toDate) baseWhere.createdAt.lte = new Date(`${toDate}T23:59:59.999Z`);
  }

  return {
    baseWhere,
    userId: searchParams.get("userId") || undefined,
    officeId: searchParams.get("officeId") || undefined,
    departmentId: searchParams.get("departmentId") || undefined,
    assignedUserId: searchParams.get("assignedUserId") || undefined,
    leadStatus: searchParams.get("leadStatus") || undefined,
    paymentStatus: searchParams.get("paymentStatus") || undefined,
    countryId: searchParams.get("countryId") || undefined,
    serviceId: searchParams.get("serviceId") || undefined,
    documentTypeId: searchParams.get("documentTypeId") || undefined,
    processOfficeId: searchParams.get("processOfficeId") || undefined,
    leadSourceId: searchParams.get("leadSourceId") || undefined,
    subPackage: searchParams.get("subPackage") || undefined,
    search: searchParams.get("search") || undefined,
  };
}

export function applyFiltersToLead(baseWhere: any, filters: any) {
  const where = { 
    ...baseWhere,
    ...(filters.userId ? { assignedUserId: filters.userId } : {}),
    ...(filters.assignedUserId ? { assignedUserId: filters.assignedUserId } : {}),
    ...(filters.leadStatus ? { leadStatus: filters.leadStatus } : {}),
    ...(filters.countryId ? { country: filters.countryId } : {}),
    ...(filters.serviceId ? { service: filters.serviceId } : {}),
    ...(filters.leadSourceId ? { source: filters.leadSourceId } : {})
  };
  
  if (filters.search) {
    where.OR = [
      { leadCode: { contains: filters.search } },
      { firstName: { contains: filters.search } },
      { lastName: { contains: filters.search } },
      { email: { contains: filters.search } },
      { mobileNumber: { contains: filters.search } },
    ];
  }
  return where;
}

export function applyFiltersToRegistration(baseWhere: any, filters: any) {
  const where = { 
    ...baseWhere,
    ...(filters.userId ? { createdBy: filters.userId } : {}),
    ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus } : {}),
    ...(filters.countryId ? { country: filters.countryId } : {}),
    ...(filters.serviceId ? { processType: filters.serviceId } : {}),
    ...(filters.documentTypeId ? { documentType: filters.documentTypeId } : {}),
    ...(filters.subPackage ? { subPackage: filters.subPackage } : {}),
  };
  
  if (filters.search) {
    where.OR = [
      { trackingNumber: { contains: filters.search } },
      { customerName: { contains: filters.search } },
      { email: { contains: filters.search } },
      { mobile: { contains: filters.search } },
      { processType: { contains: filters.search } },
      { subPackage: { contains: filters.search } },
    ];
  }
  return where;
}

export function applyFiltersToFollowup(baseWhere: any, filters: any) {
  return {
    ...baseWhere,
    ...(filters.userId ? { userId: filters.userId } : {})
  };
}

export function applyFiltersToAttendance(baseWhere: any, filters: any) {
  return {
    ...baseWhere,
    ...(filters.userId ? { userId: filters.userId } : {})
  };
}

export function applyFiltersToDocumentMovement(baseWhere: any, filters: any) {
  const where = { ...baseWhere };
  delete where.ownerAdminId; // DocumentMovement schema does not have ownerAdminId
  
  return {
    ...where,
    ...(filters.userId ? { createdBy: filters.userId } : {})
  };
}

export function applyFiltersToProcess(baseWhere: any, filters: any) {
  return {
    ...baseWhere,
    ...(filters.userId ? { assignedUserId: filters.userId } : {})
  };
}
