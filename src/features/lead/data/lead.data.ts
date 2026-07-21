import { processTypesMasterList } from "@/config/process-types";

export type LeadFormValues = {
  firstName: string;
  lastName: string;
  countryCode: string;
  mobileNumber: string;
  email: string;
  docType: string;
  noOfDocuments: string;
  country: string;
  state: string;
  documentIssuedCountry: string;
  service: string;
  source: string;
  leadStatus: string;
  clientType: string;
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
export const services = processTypesMasterList;
export const sources = ["Website", "WhatsApp", "Walk-in", "Referral", "Instagram", "Google"];
export const clientTypes = ["Individual", "Corporate", "Travel Agency", "HR Partner"];
export const docTypes = [
  "Education Documents",
  "Non-Education Documents",
  "Commercial Documents",
  "PCC Documents",
  "One and Same Documents",
  "Single Status Documents",
  "Visa Documents",
  "WES Documents",
  "POA Documents",
  "Marriage Documents",
  "Birth Certificate",
];
export const defaultLeadValues: LeadFormValues = {
  firstName: "",
  lastName: "",
  countryCode: "+91",
  mobileNumber: "",
  email: "",
  docType: "",
  noOfDocuments: "",
  country: "",
  state: "",
  documentIssuedCountry: "",
  service: "",
  source: "",
  leadStatus: "New",
  clientType: "",
  amount: "",
  workingDays: "",
  remark: "",
  assignedUserId: "",
  assignedUser: "",
  nextFollowupAt: "",
};
