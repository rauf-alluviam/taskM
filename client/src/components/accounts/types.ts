export interface MasterType {
  _id: string;
  name: string;
  fields: {
    name: string;
    type: string;
    required: boolean;
  }[];
  organization?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomField {
  id: number;
  name: string;
  type: "text" | "number" | "date" | "email" | "phone" | "upload";
  value: string | string[];
  required?: boolean;
}

export interface DefaultFields {
  companyName: string;
  address: string;
  billingDate: string;
  dueDate: string;
  reminder: "weekly" | "monthly" | "quarterly" | "half-yearly" | "yearly";
}

export interface MasterEntry {
  _id: string;
  masterTypeId?: string;
  masterTypeName: string;
  organization?: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  defaultFields: DefaultFields;
  customFields: CustomField[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ReminderOption {
  value: DefaultFields["reminder"];
  label: string;
}

export interface MasterFormData {
  id: string | null;
  masterType: string;
  defaultFields: DefaultFields;
  customFields: CustomField[];
}

export interface MasterTypeStats {
  total: number;
  overdue: number;
  upcoming: number;
}

export type FieldType =
  | "text"
  | "number"
  | "date"
  | "email"
  | "phone"
  | "upload";

// Add organization and user context
export interface User {
  _id: string;
  name: string;
  email: string;
  role: "super_admin" | "org_admin" | "team_lead" | "member" | "viewer";
  organization: string;
}

export interface Organization {
  _id: string;
  name: string;
}
