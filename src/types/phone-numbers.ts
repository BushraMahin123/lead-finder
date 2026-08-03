export type UserPhoneNumberStatus = "active" | "pending" | "released" | "failed";

export interface UserPhoneNumber {
  id: string;
  userId: string;
  phoneNumber: string;
  telnyxNumberId: string | null;
  telnyxOrderId: string | null;
  countryCode: string;
  status: UserPhoneNumberStatus;
  isDefault: boolean;
  monthlyCost: number | null;
  upfrontCost: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvailablePhoneNumber {
  phoneNumber: string;
  regionInformation?: Array<{ region_name?: string; region_type?: string }>;
  costInformation?: {
    monthly_cost?: string;
    upfront_cost?: string;
    currency?: string;
  };
  phoneNumberType?: string;
  features?: Array<{ name?: string }>;
}
