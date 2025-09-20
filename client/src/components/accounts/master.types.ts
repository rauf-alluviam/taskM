// types/master.types.ts
export interface CustomField {
  id: string | number;
  name: string;
  value: string | string[];
  type: 'text' | 'number' | 'date' | 'email' | 'phone' | 'upload';
  required?: boolean;
}

export interface DefaultFields {
  companyName: string;
  address: string;
  billingDate: string;
  dueDate: string;
  reminder: 'weekly' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
}

export interface MasterType {
  _id: string;
  name: string;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
  }>;
}

export interface MasterEntry {
  _id: string;
  masterTypeName: string;
  defaultFields: DefaultFields;
  customFields: CustomField[];
}

export interface MasterData {
  id: string | null;
  masterType: string;
  defaultFields: DefaultFields;
  customFields: CustomField[];
}
