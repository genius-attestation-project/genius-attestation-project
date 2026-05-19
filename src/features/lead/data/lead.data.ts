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
  assignedUser: string;
  nextFollowupAt: string;
};

export const leadStatuses = [
  "New",
  "Followup",
  "Assigned",
  "Pending Approval",
  "Closed",
];

export const countryCodes = ["+91", "+971", "+968", "+974", "+965", "+973", "+966"];
export const countries = [
  "India",
  "United Arab Emirates",
  "Oman",
  "Qatar",
  "Kuwait",
  "Bahrain",
  "Saudi Arabia",
];
export const states = [
  "Kerala",
  "Tamil Nadu",
  "Karnataka",
  "Maharashtra",
  "Dubai",
  "Doha",
  "Muscat",
];
export const services = [
  "Degree Attestation",
  "Birth Certificate",
  "Marriage Certificate",
  "Commercial Document",
  "HRD + Embassy",
  "Certificate Translation",
];
export const sources = ["Website", "WhatsApp", "Walk-in", "Referral", "Instagram", "Google"];
export const clientTypes = ["Individual", "Corporate", "Travel Agency", "HR Partner"];
export const docTypes = [
  "Degree Certificate",
  "Birth Certificate",
  "Marriage Certificate",
  "Commercial Document",
  "Police Clearance",
];
export const assignedUsers = ["Ananya Das", "Rohan James", "Meera S", "Faizal P"];

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
  assignedUser: "",
  nextFollowupAt: "",
};
