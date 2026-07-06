import {
  enqueueAirscale,
  isRetryableHttpStatus,
  RetryableQueueError,
} from "@/lib/api-queue";
import type { EnrichContactResult, LeadPerson } from "@/types/lead";

const AIRSCALE_API = "https://api.airscale.io/v1";

interface AirscaleEmailResponse {
  status?: string;
  email?: string;
  email_status?: string;
  error?: string;
  message?: string;
}

interface AirscalePhoneResponse {
  status?: string;
  phone_numbers?: string | string[];
  error?: string;
  message?: string;
}

function getApiKey(): string {
  const key = process.env.AIRSCALE_API_KEY;
  if (!key) {
    throw new Error(
      "Contact extraction is not configured. Contact your administrator.",
    );
  }
  return key;
}

async function airscalePost<T>(
  path: string,
  body: Record<string, string>,
): Promise<T> {
  return enqueueAirscale(async () => {
    const response = await fetch(`${AIRSCALE_API}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data: AirscaleEmailResponse & AirscalePhoneResponse = {};

    if (text) {
      try {
        data = JSON.parse(text) as AirscaleEmailResponse & AirscalePhoneResponse;
      } catch {
        throw new Error(`Extraction returned an invalid response (${response.status}).`);
      }
    }

    if (isRetryableHttpStatus(response.status)) {
      const detail = data.error ?? data.message ?? `Request failed (${response.status})`;
      throw new RetryableQueueError(detail, response.status);
    }

    if (!response.ok) {
      const detail = data.error ?? data.message ?? `Request failed (${response.status})`;
      throw new Error(detail);
    }

    return data as T;
  });
}

function splitName(person: LeadPerson): { firstName?: string; lastName?: string } {
  if (person.first_name || person.last_name) {
    return {
      firstName: person.first_name,
      lastName: person.last_name,
    };
  }

  if (!person.name?.trim()) return {};

  const parts = person.name.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function buildEmailBody(person: LeadPerson): Record<string, string> | null {
  const body: Record<string, string> = {};
  const { firstName, lastName } = splitName(person);

  if (person.linkedin_url) {
    body.linkedin_profile_url = person.linkedin_url;
  }

  if (firstName) body.first_name = firstName;
  if (lastName) body.last_name = lastName;
  if (person.organization?.primary_domain) {
    body.domain = person.organization.primary_domain;
  }
  if (person.organization?.name) {
    body.company_name = person.organization.name;
  }

  if (body.linkedin_profile_url) return body;

  if (body.first_name && body.last_name && (body.domain || body.company_name)) {
    return body;
  }

  return null;
}

function normalizePhones(value?: string | string[]) {
  if (!value) return undefined;

  const numbers = Array.isArray(value) ? value : [value];
  const cleaned = numbers.map((number) => number.trim()).filter(Boolean);
  if (cleaned.length === 0) return undefined;

  return cleaned.map((number) => ({
    sanitized_number: number,
    raw_number: number,
    type: "mobile",
  }));
}

async function findEmail(
  person: LeadPerson,
): Promise<{ email?: string; email_status?: string }> {
  const body = buildEmailBody(person);
  if (!body) return {};

  try {
    const data = await airscalePost<AirscaleEmailResponse>("/email", body);
    return {
      email: data.email,
      email_status: data.email_status,
    };
  } catch {
    return {};
  }
}

async function findPhone(
  person: LeadPerson,
): Promise<EnrichContactResult["phone_numbers"]> {
  if (!person.linkedin_url) return undefined;

  try {
    const data = await airscalePost<AirscalePhoneResponse>("/phone", {
      linkedin_profile_url: person.linkedin_url,
    });
    return normalizePhones(data.phone_numbers);
  } catch {
    return undefined;
  }
}

export async function enrichEmailContact(
  person: LeadPerson,
): Promise<EnrichContactResult> {
  if (!buildEmailBody(person)) {
    return {
      id: person.id,
      error:
        "Need a LinkedIn profile URL, or name plus company/domain to find email.",
    };
  }

  const emailResult = await findEmail(person);
  if (!emailResult.email) {
    return { id: person.id, error: "No email found for this contact." };
  }

  return {
    id: person.id,
    email: emailResult.email,
    email_status: emailResult.email_status,
  };
}

export async function enrichPhoneContact(
  person: LeadPerson,
): Promise<EnrichContactResult> {
  if (!person.linkedin_url) {
    return {
      id: person.id,
      error: "Need a LinkedIn profile URL to find phone number.",
    };
  }

  const phoneNumbers = await findPhone(person);
  if (!phoneNumbers?.length) {
    return { id: person.id, error: "No phone number found for this contact." };
  }

  return { id: person.id, phone_numbers: phoneNumbers };
}

export async function enrichContact(
  person: LeadPerson,
): Promise<EnrichContactResult> {
  const hasEmailInput = Boolean(buildEmailBody(person));
  const hasPhoneInput = Boolean(person.linkedin_url);

  if (!hasEmailInput && !hasPhoneInput) {
    return {
      id: person.id,
      error:
        "Need a LinkedIn profile URL, or name plus company/domain to extract contacts.",
    };
  }

  const [emailResult, phoneNumbers] = await Promise.all([
    hasEmailInput
      ? findEmail(person)
      : Promise.resolve({} as { email?: string; email_status?: string }),
    hasPhoneInput
      ? findPhone(person)
      : Promise.resolve(undefined as EnrichContactResult["phone_numbers"]),
  ]);

  const hasEmail = Boolean(emailResult.email);
  const hasPhone = Boolean(phoneNumbers?.length);

  if (!hasEmail && !hasPhone) {
    return {
      id: person.id,
      error: "No email or phone number found for this contact.",
    };
  }

  return {
    id: person.id,
    email: emailResult.email,
    email_status: emailResult.email_status,
    phone_numbers: phoneNumbers,
  };
}

export async function enrichContacts(
  people: LeadPerson[],
): Promise<EnrichContactResult[]> {
  return Promise.all(people.map((person) => enrichContact(person)));
}
