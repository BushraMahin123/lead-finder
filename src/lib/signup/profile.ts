import {
  COMPANY_SIZE_OPTIONS,
  INDUSTRY_OPTIONS,
  USE_CASE_OPTIONS,
  type CompanySize,
  type Industry,
  type UseCase,
} from "@/lib/signup/options";

export type SignupProfileInput = {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  jobTitle: string;
  companySize: CompanySize;
  industry: Industry;
  phone: string | null;
  country: string | null;
  useCase: UseCase;
  marketingOptIn: boolean;
};

const COMPANY_SIZES = new Set(
  COMPANY_SIZE_OPTIONS.map((option) => option.value),
);
const INDUSTRIES = new Set(INDUSTRY_OPTIONS.map((option) => option.value));
const USE_CASES = new Set(USE_CASE_OPTIONS.map((option) => option.value));

function readText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function isValidOption<T extends string>(
  value: string,
  allowed: Set<T>,
): value is T {
  return allowed.has(value as T);
}

export function parseSignupProfile(formData: FormData):
  | { ok: true; profile: SignupProfileInput }
  | { ok: false; error: string } {
  const email = readText(formData, "email").toLowerCase();
  const firstName = readText(formData, "first_name");
  const lastName = readText(formData, "last_name");
  const companyName = readText(formData, "company_name");
  const jobTitle = readText(formData, "job_title");
  const companySize = readText(formData, "company_size");
  const industry = readText(formData, "industry");
  const phone = readText(formData, "phone") || null;
  const country = readText(formData, "country") || null;
  const useCase = readText(formData, "use_case");
  const password = String(formData.get("password") ?? "");
  const marketingOptIn = formData.get("marketing_opt_in") === "on";

  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }

  if (password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  if (!firstName || !lastName) {
    return { ok: false, error: "First and last name are required." };
  }

  if (!companyName || !jobTitle) {
    return { ok: false, error: "Company name and job title are required." };
  }

  if (!isValidOption(companySize, COMPANY_SIZES)) {
    return { ok: false, error: "Please select a company size." };
  }

  if (!isValidOption(industry, INDUSTRIES)) {
    return { ok: false, error: "Please select an industry." };
  }

  if (!isValidOption(useCase, USE_CASES)) {
    return { ok: false, error: "Please select how you plan to use Lead Finder." };
  }

  return {
    ok: true,
    profile: {
      email,
      firstName,
      lastName,
      companyName,
      jobTitle,
      companySize,
      industry,
      phone,
      country,
      useCase,
      marketingOptIn,
    },
  };
}

export async function saveUserProfile(
  userId: string,
  profile: SignupProfileInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { getSupabaseAdmin } = await import("@/lib/supabase");

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      error: "Account setup is temporarily unavailable. Please try again later.",
    };
  }

  const { error } = await admin.from("user_profiles").upsert(
    {
      user_id: userId,
      email: profile.email,
      first_name: profile.firstName,
      last_name: profile.lastName,
      company_name: profile.companyName,
      job_title: profile.jobTitle,
      company_size: profile.companySize,
      industry: profile.industry,
      phone: profile.phone,
      country: profile.country,
      use_case: profile.useCase,
      marketing_opt_in: profile.marketingOptIn,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return {
      ok: false,
      error: "We could not save your profile. Please try again.",
    };
  }

  return { ok: true };
}
