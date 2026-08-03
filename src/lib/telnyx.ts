import type { AvailablePhoneNumber } from "@/types/phone-numbers";

const TELNYX_API_BASE = "https://api.telnyx.com/v2";

function getApiKey(): string {
  const apiKey = process.env.TELNYX_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("TELNYX_API_KEY is not configured");
  }
  return apiKey;
}

export function getTelnyxConnectionId(): string | null {
  return process.env.TELNYX_CONNECTION_ID?.trim() || null;
}

export function isTelnyxNumberOrderingConfigured(): boolean {
  return Boolean(
    process.env.TELNYX_API_KEY?.trim() && process.env.TELNYX_CONNECTION_ID?.trim(),
  );
}

export function isTelnyxDialerConfigured(): boolean {
  return isTelnyxSoftphoneConfigured();
}

/** Softphone can start if API + credential exist; caller ID may come from user number. */
export function isTelnyxSoftphoneConfigured(): boolean {
  return Boolean(
    process.env.TELNYX_API_KEY?.trim() &&
      process.env.TELNYX_TELEPHONY_CREDENTIAL_ID?.trim(),
  );
}

export function getTelnyxCallerNumber(): string | null {
  return process.env.TELNYX_PHONE_NUMBER?.trim() || null;
}

export async function createTelnyxLoginToken(): Promise<string> {
  const apiKey = getApiKey();
  const credentialId = process.env.TELNYX_TELEPHONY_CREDENTIAL_ID?.trim();

  if (!credentialId) {
    throw new Error("TELNYX_TELEPHONY_CREDENTIAL_ID is not configured");
  }

  const response = await fetch(
    `${TELNYX_API_BASE}/telephony_credentials/${credentialId}/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "text/plain",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      body.trim() || `Failed to create Telnyx token (${response.status})`,
    );
  }

  const token = (await response.text()).trim();
  if (!token) {
    throw new Error("Telnyx returned an empty token");
  }

  return token;
}

async function telnyxJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${TELNYX_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    const errObj = json as { errors?: Array<{ detail?: string; title?: string }> } | null;
    const detail =
      errObj?.errors?.[0]?.detail ||
      errObj?.errors?.[0]?.title ||
      (typeof text === "string" && text.trim()) ||
      `Telnyx request failed (${response.status})`;
    throw new Error(detail);
  }

  return json as T;
}

export async function searchAvailablePhoneNumbers(input: {
  countryCode: string;
  areaCode?: string;
  locality?: string;
  limit?: number;
}): Promise<AvailablePhoneNumber[]> {
  const params = new URLSearchParams();
  params.set("filter[country_code]", input.countryCode.toUpperCase());
  params.set("filter[features][]", "voice");
  params.set("filter[limit]", String(input.limit ?? 20));
  params.set("filter[best_effort]", "true");

  const areaCode = input.areaCode?.trim();
  if (areaCode) {
    // US/CA area codes are 3 digits; ignore zip-like values so locality can match.
    if (/^\d{3}$/.test(areaCode)) {
      params.set("filter[national_destination_code]", areaCode);
    }
  }
  if (input.locality?.trim()) {
    params.set("filter[locality]", input.locality.trim());
  }

  const result = await telnyxJson<{
    data?: Array<{
      phone_number?: string;
      phone_number_type?: string;
      region_information?: AvailablePhoneNumber["regionInformation"];
      cost_information?: AvailablePhoneNumber["costInformation"];
      features?: AvailablePhoneNumber["features"];
    }>;
  }>(`/available_phone_numbers?${params.toString()}`);

  return (result.data ?? [])
    .filter((row) => Boolean(row.phone_number))
    .map((row) => ({
      phoneNumber: row.phone_number as string,
      phoneNumberType: row.phone_number_type,
      regionInformation: row.region_information,
      costInformation: row.cost_information,
      features: row.features,
    }));
}

export async function orderPhoneNumber(input: {
  phoneNumber: string;
  connectionId?: string | null;
}): Promise<{
  orderId: string | null;
  phoneNumberId: string | null;
  phoneNumber: string;
  status: string | null;
}> {
  const connectionId = input.connectionId ?? getTelnyxConnectionId();

  const body: Record<string, unknown> = {
    phone_numbers: [{ phone_number: input.phoneNumber }],
  };
  if (connectionId) {
    body.connection_id = connectionId;
  }

  const result = await telnyxJson<{
    data?: {
      id?: string;
      status?: string;
      phone_numbers?: Array<{
        id?: string;
        phone_number?: string;
        status?: string;
      }>;
    };
  }>("/number_orders", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const ordered = result.data?.phone_numbers?.[0];
  let phoneNumberId = ordered?.id ?? null;

  // Ensure voice connection assignment if order didn't attach it.
  if (connectionId && phoneNumberId) {
    try {
      await telnyxJson(`/phone_numbers/${phoneNumberId}`, {
        method: "PATCH",
        body: JSON.stringify({ connection_id: connectionId }),
      });
    } catch {
      // Order may still succeed; connection can be fixed in portal if needed.
    }
  } else if (connectionId && input.phoneNumber) {
    // Some responses omit id; try lookup by number.
    try {
      const listed = await telnyxJson<{
        data?: Array<{ id?: string; phone_number?: string }>;
      }>(
        `/phone_numbers?filter[phone_number]=${encodeURIComponent(input.phoneNumber)}`,
      );
      phoneNumberId = listed.data?.[0]?.id ?? phoneNumberId;
      if (phoneNumberId) {
        await telnyxJson(`/phone_numbers/${phoneNumberId}`, {
          method: "PATCH",
          body: JSON.stringify({ connection_id: connectionId }),
        });
      }
    } catch {
      // ignore lookup failure
    }
  }

  return {
    orderId: result.data?.id ?? null,
    phoneNumberId,
    phoneNumber: ordered?.phone_number ?? input.phoneNumber,
    status: ordered?.status ?? result.data?.status ?? null,
  };
}
