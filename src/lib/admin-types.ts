export type AdminUserSummary = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  jobTitle: string;
  createdAt: string;
  isSuperAdmin: boolean;
  planId: string;
  planName: string;
  balance: number;
  campaignCount: number;
  contactCount: number;
};

export type AdminLedgerEntry = {
  id: string;
  userId: string;
  userEmail: string | null;
  amount: number;
  balanceAfter: number;
  type: string;
  description: string | null;
  createdAt: string;
};

export type AdminCampaignSummary = {
  id: string;
  userId: string;
  userEmail: string | null;
  name: string;
  status: string;
  contactCount: number;
  aiQuery: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminStats = {
  totalUsers: number;
  totalCampaigns: number;
  totalContacts: number;
  totalTokenBalance: number;
  tokensCreditedToday: number;
  tokensDebitedToday: number;
};
