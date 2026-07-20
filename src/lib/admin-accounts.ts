import { randomBytes } from "node:crypto";
import {
  isEmailConfigured,
  sendAccountCredentialsEmail,
} from "@/lib/email";
import { getSupabaseAdmin } from "@/lib/supabase";
import type {
  AdminCreateUserInput,
  AdminCreateUserResult,
  AdminWaitlistSignup,
} from "@/lib/admin-types";
import {
  type CompanySize,
  type Industry,
  type UseCase,
} from "@/lib/signup/options";
import { saveUserProfile, type SignupProfileInput } from "@/lib/signup/profile";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getAdminOrThrow() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase is not configured");
  }
  return admin;
}

function splitName(name: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const trimmed = (name ?? "").trim();
  if (!trimmed) {
    return { firstName: "User", lastName: "Account" };
  }

  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] ?? "User",
    lastName: parts.slice(1).join(" ") || "Account",
  };
}

export function generateTemporaryPassword(length = 14): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%";
  const bytes = randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i += 1) {
    password += alphabet[bytes[i]! % alphabet.length];
  }
  return password;
}

export async function listAdminWaitlist(input: {
  query?: string;
  page?: number;
  perPage?: number;
}): Promise<{ signups: AdminWaitlistSignup[]; total: number }> {
  const admin = getAdminOrThrow();
  const page = Math.max(1, input.page ?? 1);
  const perPage = Math.min(50, Math.max(1, input.perPage ?? 20));
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const query = input.query?.trim();

  let signupQuery = admin
    .from("waitlist_signups")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (query) {
    const pattern = `%${query}%`;
    signupQuery = signupQuery.or(
      [
        `email.ilike.${pattern}`,
        `name.ilike.${pattern}`,
        `company.ilike.${pattern}`,
        `role.ilike.${pattern}`,
      ].join(","),
    );
  }

  const { data, count, error } = await signupQuery;
  if (error) throw new Error(error.message);

  const signups = (data ?? []).map((row) => ({
    id: row.id as string,
    email: row.email as string,
    name: (row.name as string | null) ?? null,
    company: (row.company as string | null) ?? null,
    role: (row.role as string | null) ?? null,
    useCase: (row.use_case as string | null) ?? null,
    source: row.source as string,
    createdAt: row.created_at as string,
    invitedAt: (row.invited_at as string | null) ?? null,
    invitedUserId: (row.invited_user_id as string | null) ?? null,
  }));

  return { signups, total: count ?? signups.length };
}

export async function deleteWaitlistSignup(id: string): Promise<void> {
  const admin = getAdminOrThrow();
  const { error } = await admin.from("waitlist_signups").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getWaitlistSignupById(
  id: string,
): Promise<AdminWaitlistSignup | null> {
  const admin = getAdminOrThrow();
  const { data, error } = await admin
    .from("waitlist_signups")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id as string,
    email: data.email as string,
    name: (data.name as string | null) ?? null,
    company: (data.company as string | null) ?? null,
    role: (data.role as string | null) ?? null,
    useCase: (data.use_case as string | null) ?? null,
    source: data.source as string,
    createdAt: data.created_at as string,
    invitedAt: (data.invited_at as string | null) ?? null,
    invitedUserId: (data.invited_user_id as string | null) ?? null,
  };
}

function buildProfileFromCreateInput(
  input: AdminCreateUserInput,
): SignupProfileInput {
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName?.trim() || "User";
  const lastName = input.lastName?.trim() || "Account";

  return {
    email,
    firstName,
    lastName,
    companyName: input.companyName?.trim() || "Unknown",
    jobTitle: input.jobTitle?.trim() || "Team member",
    companySize: (input.companySize as CompanySize | undefined) ?? "1-10",
    industry: (input.industry as Industry | undefined) ?? "other",
    phone: input.phone?.trim() || null,
    country: input.country?.trim() || null,
    useCase: (input.useCase as UseCase | undefined) ?? "other",
    marketingOptIn: false,
  };
}

export async function createUserAccountAsAdmin(
  input: AdminCreateUserInput,
): Promise<AdminCreateUserResult> {
  const email = input.email.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    throw new Error("A valid email is required");
  }

  const password =
    input.password?.trim() && input.password.trim().length >= 6
      ? input.password.trim()
      : generateTemporaryPassword();

  const sendEmail = input.sendEmail !== false;
  const profile = buildProfileFromCreateInput({ ...input, email });
  const admin = getAdminOrThrow();

  const { data: existingProfile } = await admin
    .from("user_profiles")
    .select("user_id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    throw new Error("An account with this email already exists");
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: profile.firstName,
      last_name: profile.lastName,
      full_name: `${profile.firstName} ${profile.lastName}`,
      company_name: profile.companyName,
      job_title: profile.jobTitle,
      created_by_admin: true,
    },
  });

  if (createError) {
    throw new Error(createError.message);
  }

  if (!created.user) {
    throw new Error("Account could not be created");
  }

  const saved = await saveUserProfile(created.user.id, profile);
  if (!saved.ok) {
    await admin.auth.admin.deleteUser(created.user.id);
    throw new Error(saved.error);
  }

  if (input.waitlistSignupId) {
    const { error: inviteError } = await admin
      .from("waitlist_signups")
      .update({
        invited_at: new Date().toISOString(),
        invited_user_id: created.user.id,
      })
      .eq("id", input.waitlistSignupId);

    if (inviteError) {
      console.error(
        "[admin] failed to mark waitlist signup invited:",
        inviteError.message,
      );
    }
  }

  let emailSent = false;
  let emailError: string | null = null;

  if (sendEmail) {
    if (!isEmailConfigured()) {
      emailError =
        "Account created, but email is not configured (set RESEND_API_KEY). Share the temporary password manually.";
    } else {
      const sent = await sendAccountCredentialsEmail({
        to: email,
        firstName: profile.firstName,
        email,
        password,
      });
      if (sent.ok) {
        emailSent = true;
      } else {
        emailError = `Account created, but email failed: ${sent.error}`;
      }
    }
  }

  return {
    userId: created.user.id,
    email,
    temporaryPassword: password,
    emailSent,
    emailError,
  };
}

export async function inviteWaitlistSignupAsAdmin(input: {
  signupId: string;
  password?: string;
  sendEmail?: boolean;
}): Promise<AdminCreateUserResult> {
  const signup = await getWaitlistSignupById(input.signupId);
  if (!signup) {
    throw new Error("Waitlist signup not found");
  }

  if (signup.invitedUserId) {
    throw new Error("This waitlist signup already has an account");
  }

  const names = splitName(signup.name);

  return createUserAccountAsAdmin({
    email: signup.email,
    firstName: names.firstName,
    lastName: names.lastName,
    companyName: signup.company ?? undefined,
    jobTitle: signup.role ?? undefined,
    password: input.password,
    sendEmail: input.sendEmail,
    waitlistSignupId: signup.id,
  });
}
