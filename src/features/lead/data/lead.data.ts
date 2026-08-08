import { processTypesMasterList } from "@/config/process-types";

export type LeadFormValues = {
  firstName: string;
  lastName: string;
  countryCode: string;
  mobileNumber: string;
  email: string;
  docType: string;
  documentName: string;
  noOfDocuments: string;
  country: string;
  state: string;
  documentIssuedCountry: string;
  service: string;
  source: string;
  leadStatus: string;
  clientType: string;
  corporateDetailId?: string;
  amount: string;
  workingDays: string;
  remark: string;
  assignedUserId: string;
  assignedUser: string;
  nextFollowupAt: string;
};

export const leadStatuses = [
  "New",
  "Qualified",
  "Potential Qualified",
  "Followup",
  "Assigned",
  "Pending Approval",
  "Closed",
  "LOB",
];

export const leadFormStatuses = [
  "New",
  "Qualified",
  "Potential Qualified",
  "Closed",
  "LOB",
] as const;

export const countryCodes = ["+91", "+971", "+968", "+974", "+965", "+973", "+966", "+1", "+44", "+61"];
// Note: services, sources, clientTypes, and docTypes have been migrated to the database and are now fetched dynamically via the Master Data API.
export const defaultLeadValues: LeadFormValues = {
  firstName: "",
  lastName: "",
  countryCode: "+91",
  mobileNumber: "",
  email: "",
  docType: "",
  documentName: "",
  noOfDocuments: "",
  country: "",
  state: "",
  documentIssuedCountry: "",
  service: "",
  source: "",
  leadStatus: "New",
  clientType: "",
  corporateDetailId: "",
  amount: "",
  workingDays: "",
  remark: "",
  assignedUserId: "",
  assignedUser: "",
  nextFollowupAt: "",
};
