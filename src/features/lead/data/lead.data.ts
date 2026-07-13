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
export const services = [
  "UAE Embassy & MOFA",
  "UAE MOFA Only",
  "UAE Consulate",
  "UAE Embassy & MOFA & Translation",
  "Only UAE Embassy & MOFA",
  "Oman Embassy",
  "Saudi Consulate",
  "Qatar Consulate",
  "Qatar Embassy Only",
  "Qatar Embassy & MOFA",
  "Qatar Embassy & MOFA & Translation",
  "Kuwait Consulate",
  "Kuwait Embassy",
  "Kuwait Embassy & Translation",
  "Saudi Culture",
  "Saudi Culture + Apostille with Barcode",
  "China Consulate",
  "China Embassy Attestation",
  "Translation",
  "Sworn Translation",
  "Apostille with Barcode",
  "Apostille with WNR",
  "Apostille - Not Verified",
  "HRD + Apostille (Italy)",
  "HRD + Apostille (Taiwan)",
  "Vietnam Attestation",
  "Egypt Attestation",
  "Malaysia Attestation",
  "Ethiopia Attestation",
  "Thailand Attestation",
  "Philippines Attestation",
  "Taiwan Attestation",
  "Indonesia Attestation",
  "Zimbabwe Attestation",
  "Andhra Pradesh HRD",
  "Assam (Guwahati) HRD",
  "Chhattisgarh - Raipur HRD",
  "Delhi HRD",
  "Goa HRD",
  "Gujarat HRD",
  "Haryana HRD",
  "Karnataka HRD",
  "Kerala HRD",
  "Madhya Pradesh HRD",
  "Maharashtra HRD",
  "Odisha HRD",
  "Punjab HRD",
  "Sikkim HRD",
  "Tamil Nadu HRD",
  "Uttar Pradesh HRD",
  "West Bengal HRD",
  "Bihar HRD",
  "Jharkhand - Ranchi HRD",
  "Uttarakhand HRD",
  "State Home Department (Non-Educational Documents)",
  "Mumbai Notary + Home Department",
  "Only MEA",
  "UAE Police Clearance Certificate",
  "Kuwait Police Clearance Certificate",
  "Oman Police Clearance Certificate",
  "Saudi Police Clearance Certificate",
  "Qatar Police Clearance Certificate",
  "WES Attestation",
  "Kuwait Visa Stamping",
  "Other Services (Arrangement of Documents)"
];
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
