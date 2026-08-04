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
  phoneNumber: string | null;
  phoneNumberCount: number;
  callCount: number;
  connectedCallCount: number;
  totalCallSeconds: number;
};

export type AdminCallSummary = {
  callCount: number;
  connectedCallCount: number;
  failedCallCount: number;
  totalCallSeconds: number;
  averageCallSeconds: number;
  lastCallAt: string | null;
};

export type AdminCallLogSummary = {
  id: string;
  toNumber: string;
  fromNumber: string | null;
  status: string;
  disposition: string | null;
  durationSeconds: number | null;
  personName: string | null;
  createdAt: string;
  endedAt: string | null;
  hasRecording: boolean;
  transcriptionStatus: string | null;
  transcript: string | null;
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

export type AdminWaitlistSignup = {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  role: string | null;
  useCase: string | null;
  source: string;
  createdAt: string;
  invitedAt: string | null;
  invitedUserId: string | null;
};

export type AdminCreateUserInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  jobTitle?: string;
  companySize?: string;
  industry?: string;
  useCase?: string;
  phone?: string;
  country?: string;
  password?: string;
  sendEmail?: boolean;
  waitlistSignupId?: string;
};

export type AdminCreateUserResult = {
  userId: string;
  email: string;
  temporaryPassword: string;
  emailSent: boolean;
  emailError: string | null;
};

export type AdminTelnyxBalance = {
  balance: number;
  creditLimit: number;
  availableCredit: number;
  pending: number;
  currency: string;
};

export type AdminTelnyxNumberPricing = {
  currency: string;
  sampleCount: number;
  monthlyMin: number | null;
  monthlyMax: number | null;
  monthlyAvg: number | null;
  upfrontMin: number | null;
  upfrontMax: number | null;
  upfrontAvg: number | null;
  samples: Array<{
    phoneNumber: string;
    monthlyCost: number | null;
    upfrontCost: number | null;
  }>;
};

export type AdminTelnyxInventory = {
  activeNumbers: number;
  pendingNumbers: number;
  totalMonthlyCost: number;
  totalUpfrontCost: number;
  numbersMissingCost: number;
};

export type AdminTelnyxCustomerPricing = {
  callingMonthlyUsd: number;
  numberFeeOneTimeUsd: number;
  firstPaymentUsd: number;
};

export type AdminTelnyxBillingSummary = {
  configured: boolean;
  balance: AdminTelnyxBalance | null;
  ownedOnTelnyx: {
    totalCount: number;
    preview: Array<{
      id: string;
      phoneNumber: string;
      status: string | null;
    }>;
  } | null;
  sampleNumberPricing: AdminTelnyxNumberPricing | null;
  inventory: AdminTelnyxInventory;
  customerPricing: AdminTelnyxCustomerPricing;
  errors: string[];
};
