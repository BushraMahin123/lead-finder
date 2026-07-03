import type { LeadPerson, SearchFilters } from "@/types/lead";

export type CampaignStatus = "draft" | "active" | "archived";

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

export interface CampaignWithContacts extends Campaign {
  contacts: LeadPerson[];
}
