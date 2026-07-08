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
    search: searchParams.get("search") || undefined,
  };
}

export function applyFiltersToLead(baseWhere: any, filters: any) {
  const where = { ...baseWhere };
  if (filters.userId) where.assignedUserId = filters.userId;
  if (filters.assignedUserId) where.assignedUserId = filters.assignedUserId;
  if (filters.leadStatus) where.leadStatus = filters.leadStatus;
  if (filters.countryId) where.country = filters.countryId;
  if (filters.serviceId) where.service = filters.serviceId;
  if (filters.leadSourceId) where.source = filters.leadSourceId;
  
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
  const where = { ...baseWhere };
  
  if (filters.userId) where.createdBy = filters.userId;
  if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
  if (filters.countryId) where.country = filters.countryId;
  if (filters.serviceId) where.processType = filters.serviceId;
  if (filters.documentTypeId) where.documentType = filters.documentTypeId;
  
  if (filters.search) {
    where.OR = [
      { trackingNumber: { contains: filters.search } },
      { customerName: { contains: filters.search } },
      { email: { contains: filters.search } },
      { mobile: { contains: filters.search } },
    ];
  }
  return where;
}

export function applyFiltersToFollowup(baseWhere: any, filters: any) {
  const where = { ...baseWhere };
  if (filters.userId) where.userId = filters.userId;
  return where;
}

export function applyFiltersToAttendance(baseWhere: any, filters: any) {
  const where = { ...baseWhere };
  if (filters.userId) where.userId = filters.userId;
  return where;
}

export function applyFiltersToDocumentMovement(baseWhere: any, filters: any) {
  const where = { ...baseWhere };
  if (filters.userId) where.createdBy = filters.userId;
  return where;
}

export function applyFiltersToProcess(baseWhere: any, filters: any) {
  const where = { ...baseWhere };
  if (filters.userId) where.assignedUserId = filters.userId;
  return where;
}
