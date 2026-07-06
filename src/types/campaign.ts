import type { LeadPerson, SearchFilters } from "@/types/lead";

export type CampaignStatus = "draft" | "active" | "archived";

export type ColumnValueStatus = "pending" | "running" | "done" | "error";

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  status: CampaignStatus;
  contactCount: number;
  searchTotal: number;
  aiQuery: string | null;
  searchFilters: SearchFilters;
  enrichEmail: boolean;
  enrichPhone: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignContact {
  id: string;
  campaignId: string;
  personId: string;
  personData: LeadPerson;
  sortOrder: number;
  createdAt: string;
}

export interface CampaignColumn {
  id: string;
  campaignId: string;
  name: string;
  prompt: string;
  sortOrder: number;
  promptHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignColumnValue {
  columnId: string;
  personId: string;
  value: string | null;
  status: ColumnValueStatus;
  error: string | null;
  promptHash: string;
  updatedAt: string;
}

export interface CampaignWithContacts extends Campaign {
  contacts: LeadPerson[];
  columns?: CampaignColumn[];
  columnValues?: Record<string, Record<string, CampaignColumnValue>>;
}
