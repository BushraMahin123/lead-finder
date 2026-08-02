const TELNYX_API_BASE = "https://api.telnyx.com/v2";

export function isTelnyxDialerConfigured(): boolean {
  return Boolean(
    process.env.TELNYX_API_KEY?.trim() &&
      process.env.TELNYX_TELEPHONY_CREDENTIAL_ID?.trim() &&
      process.env.TELNYX_PHONE_NUMBER?.trim(),
  );
}

export function getTelnyxCallerNumber(): string {
  const number = process.env.TELNYX_PHONE_NUMBER?.trim();
  if (!number) {
    throw new Error("TELNYX_PHONE_NUMBER is not configured");
  }
  return number;
}

export async function createTelnyxLoginToken(): Promise<string> {
  const apiKey = process.env.TELNYX_API_KEY?.trim();
  const credentialId = process.env.TELNYX_TELEPHONY_CREDENTIAL_ID?.trim();

  if (!apiKey || !credentialId) {
    throw new Error("Telnyx dialer is not configured");
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
