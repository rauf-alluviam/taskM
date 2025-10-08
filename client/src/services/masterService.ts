import { CustomField, DefaultFields } from "../components/accounts/master.types";
import { MasterType, MasterEntry, MasterFormData } from "../types/master.types";

const API_BASE_URL = import.meta.env.VITE_APP_URL;

// Auth helper function
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

// Master Types API
export const masterTypeAPI = {
  // Get all master types for current organization
  getAll: async (): Promise<MasterType[]> => {
    const response = await fetch(`${API_BASE_URL}/accounts/master-types`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch master types");
    return response.json();
  },

  // Get specific master type
  getById: async (id: string): Promise<MasterType> => {
    const response = await fetch(
      `${API_BASE_URL}/accounts/master-types/${id}`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) throw new Error("Failed to fetch master type");
    return response.json();
  },

  // Create new master type
  create: async (
    masterType: Omit<MasterType, "_id" | "createdAt" | "updatedAt">
  ): Promise<MasterType> => {
    const response = await fetch(`${API_BASE_URL}/accounts/master-types`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(masterType),
    });
    if (!response.ok) throw new Error("Failed to create master type");
    return response.json();
  },

  // Update master type
  update: async (
    id: string,
    masterType: Partial<MasterType>
  ): Promise<MasterType> => {
    const response = await fetch(
      `${API_BASE_URL}/accounts/master-types/${id}`,
      {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(masterType),
      }
    );
    if (!response.ok) throw new Error("Failed to update master type");
    return response.json();
  },

  // Delete master type (soft delete)
  delete: async (id: string): Promise<void> => {
    const response = await fetch(
      `${API_BASE_URL}/accounts/master-types/${id}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) throw new Error("Failed to delete master type");
  },
};

// Master Entries API
export const masterEntryAPI = {
  // Get all master entries for current organization
  getAll: async (): Promise<MasterEntry[]> => {
    const response = await fetch(`${API_BASE_URL}/accounts/masters`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch master entries");
    return response.json();
  },

  // Get entries by master type
  getByType: async (masterType: string): Promise<MasterEntry[]> => {
    const response = await fetch(
      `${API_BASE_URL}/accounts/masters/type/${masterType}`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) throw new Error("Failed to fetch entries by type");
    return response.json();
  },

  // Get specific master entry
  getById: async (id: string): Promise<MasterEntry> => {
    const response = await fetch(`${API_BASE_URL}/accounts/masters/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch master entry");
    return response.json();
  },

  // Create new master entry
  create: async (entryData: {
    masterType: string;
    defaultFields: DefaultFields;
    customFields: CustomField[];
  }): Promise<MasterEntry> => {
    const response = await fetch(`${API_BASE_URL}/accounts/masters`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(entryData),
    });
    if (!response.ok) throw new Error("Failed to create master entry");
    return response.json();
  },

  // Update master entry
  update: async (
    id: string,
    entryData: {
      defaultFields: DefaultFields;
      customFields: CustomField[];
    }
  ): Promise<MasterEntry> => {
    const response = await fetch(`${API_BASE_URL}/accounts/masters/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(entryData),
    });
    if (!response.ok) throw new Error("Failed to update master entry");
    return response.json();
  },

  // Delete master entry
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/accounts/masters/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete master entry");
  },

  // Search entries
  search: async (query: string): Promise<MasterEntry[]> => {
    const response = await fetch(
      `${API_BASE_URL}/accounts/masters/search/${query}`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) throw new Error("Failed to search entries");
    return response.json();
  },

  // Get entry history
  getHistory: async (entryId: string): Promise<any> => {
    const response = await fetch(
      `${API_BASE_URL}/accounts/masters/${entryId}/history`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) throw new Error("Failed to fetch entry history");
    return response.json();
  },
};

// Utility API
export const utilityAPI = {
  // Get master type by name
  getMasterTypeByName: async (name: string): Promise<MasterType> => {
    const response = await fetch(
      `${API_BASE_URL}/accounts/master-types/by-name/${name}`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) throw new Error("Failed to fetch master type by name");
    return response.json();
  },
};
