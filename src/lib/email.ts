import { Resend } from "resend";
import { absoluteAppUrl } from "@/lib/app-url";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function getFromAddress(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    "LEADMAGPRO <onboarding@resend.dev>"
  );
}

export async function sendAccountCredentialsEmail(input: {
  to: string;
  firstName: string;
  email: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error:
        "Email is not configured. Set RESEND_API_KEY to send credentials automatically.",
    };
  }

  const loginUrl = absoluteAppUrl("/login");
  const name = input.firstName.trim() || "there";
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to: input.to,
    subject: "Your LEADMAGPRO account is ready",
    text: [
      `Hi ${name},`,
      "",
      "Your LEADMAGPRO account has been created. Sign in with these credentials:",
      "",
      `Email: ${input.email}`,
      `Temporary password: ${input.password}`,
      "",
      `Sign in: ${loginUrl}`,
      "",
      "We recommend changing your password after your first login.",
      "",
      "— LEADMAGPRO",
    ].join("\n"),
    html: `
      <div style="font-family: ui-sans-serif, system-ui, sans-serif; line-height: 1.5; color: #0f172a;">
        <p>Hi ${escapeHtml(name)},</p>
        <p>Your LEADMAGPRO account has been created. Sign in with these credentials:</p>
        <p>
          <strong>Email:</strong> ${escapeHtml(input.email)}<br />
          <strong>Temporary password:</strong> <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${escapeHtml(input.password)}</code>
        </p>
        <p><a href="${escapeHtml(loginUrl)}" style="color:#4f46e5;">Sign in to LEADMAGPRO</a></p>
        <p style="color:#64748b;font-size:14px;">We recommend changing your password after your first login.</p>
        <p>— LEADMAGPRO</p>
      </div>
    `,
  });

  if (error) {
    console.error("[email] credentials send failed:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
