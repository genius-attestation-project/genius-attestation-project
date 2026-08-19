export type AccountCategory = "Root" | "Main Title" | "Sub Title" | "Leaf";

export type AccountMenuSettings = {
  accountCode?: string;
  ledgerMapping?: string;
  description?: string;
  status?: boolean;
  [key: string]: any;
};

export type AccountNode = {
  id: string;
  name: string;
  type?: string | null; // "CREDIT" | "DEBIT" | "GENERAL"
  parentId?: string | null;
  category?: string | null;
  code?: string | null;
  ledgerMapping?: string | null;
  description?: string | null;
  status: boolean;
  settings?: AccountMenuSettings | null;
  ownerAdminId: string;
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  
  // Computed & Hierarchy fields
  children?: AccountNode[];
  isLeaf?: boolean;
  childCount?: number;
};

export type AccountNodeInput = {
  name: string;
  parentId?: string | null;
  category?: string;
  description?: string | null;
  code?: string | null;
  ledgerMapping?: string | null;
  status?: boolean;
};

export type AccountNodeSettingsInput = {
  accountCode?: string | null;
  ledgerMapping?: string | null;
  description?: string | null;
  status?: boolean;
  customSettings?: Record<string, any> | null;
};

export type AccountMenuAuditLogItem = {
  id: string;
  accountMenuId?: string | null;
  nodeName: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "SETTINGS_UPDATE" | string;
  oldValue?: any;
  newValue?: any;
  performedBy?: string | null;
  performedByName?: string | null;
  ownerAdminId: string;
  createdAt: string | Date;
};
