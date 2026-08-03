import { getSupabaseAdmin } from "@/lib/supabase";
import type { UserPhoneNumber, UserPhoneNumberStatus } from "@/types/phone-numbers";

const TABLE = "user_phone_numbers";

interface UserPhoneNumberRow {
  id: string;
  user_id: string;
  phone_number: string;
  telnyx_number_id: string | null;
  telnyx_order_id: string | null;
  country_code: string;
  status: string;
  is_default: boolean;
  monthly_cost: number | string | null;
  upfront_cost: number | string | null;
  created_at: string;
  updated_at: string;
}

function getAdminOrThrow() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase is not configured");
  }
  return admin;
}

function mapRow(row: UserPhoneNumberRow): UserPhoneNumber {
  return {
    id: row.id,
    userId: row.user_id,
    phoneNumber: row.phone_number,
    telnyxNumberId: row.telnyx_number_id,
    telnyxOrderId: row.telnyx_order_id,
    countryCode: row.country_code,
    status: row.status as UserPhoneNumberStatus,
    isDefault: row.is_default,
    monthlyCost:
      row.monthly_cost == null ? null : Number(row.monthly_cost),
    upfrontCost:
      row.upfront_cost == null ? null : Number(row.upfront_cost),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listUserPhoneNumbers(
  userId: string,
): Promise<UserPhoneNumber[]> {
  const admin = getAdminOrThrow();
  const { data, error } = await admin
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .neq("status", "released")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data as UserPhoneNumberRow[] | null) ?? []).map(mapRow);
}

export async function getDefaultUserPhoneNumber(
  userId: string,
): Promise<UserPhoneNumber | null> {
  const admin = getAdminOrThrow();

  const { data: defaultRow, error: defaultError } = await admin
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("is_default", true)
    .maybeSingle();

  if (defaultError) throw new Error(defaultError.message);
  if (defaultRow) return mapRow(defaultRow as UserPhoneNumberRow);

  const { data: fallback, error: fallbackError } = await admin
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fallbackError) throw new Error(fallbackError.message);
  return fallback ? mapRow(fallback as UserPhoneNumberRow) : null;
}

export async function createUserPhoneNumber(input: {
  userId: string;
  phoneNumber: string;
  countryCode: string;
  telnyxNumberId?: string | null;
  telnyxOrderId?: string | null;
  status?: UserPhoneNumberStatus;
  monthlyCost?: number | null;
  upfrontCost?: number | null;
  makeDefault?: boolean;
}): Promise<UserPhoneNumber> {
  const admin = getAdminOrThrow();
  const existing = await listUserPhoneNumbers(input.userId);
  const makeDefault = input.makeDefault ?? existing.length === 0;

  if (makeDefault) {
    await admin
      .from(TABLE)
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq("user_id", input.userId)
      .eq("is_default", true);
  }

  const { data, error } = await admin
    .from(TABLE)
    .insert({
      user_id: input.userId,
      phone_number: input.phoneNumber,
      country_code: input.countryCode.toUpperCase(),
      telnyx_number_id: input.telnyxNumberId ?? null,
      telnyx_order_id: input.telnyxOrderId ?? null,
      status: input.status ?? "active",
      is_default: makeDefault,
      monthly_cost: input.monthlyCost ?? null,
      upfront_cost: input.upfrontCost ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as UserPhoneNumberRow);
}

export async function setDefaultUserPhoneNumber(input: {
  userId: string;
  id: string;
}): Promise<UserPhoneNumber> {
  const admin = getAdminOrThrow();

  const { data: target, error: targetError } = await admin
    .from(TABLE)
    .select("*")
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .eq("status", "active")
    .maybeSingle();

  if (targetError) throw new Error(targetError.message);
  if (!target) throw new Error("Phone number not found");

  await admin
    .from(TABLE)
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq("user_id", input.userId)
    .eq("is_default", true);

  const { data, error } = await admin
    .from(TABLE)
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as UserPhoneNumberRow);
}
