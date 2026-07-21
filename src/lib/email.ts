import { Resend } from "resend";
import { absoluteAppUrl } from "@/lib/app-url";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function getFromAddress(): string {
  // Env UIs sometimes insert line breaks into long values; collapse them.
  const configured = process.env.EMAIL_FROM?.replace(/\s+/g, " ").trim();
  return configured || "LEADMAGPRO <onboarding@resend.dev>";
}

export function renderAccountCredentialsEmail(input: {
  firstName: string;
  email: string;
  password: string;
}): { subject: string; text: string; html: string; loginUrl: string } {
  const loginUrl = absoluteAppUrl("/login");
  const logoUrl = absoluteAppUrl("/favicon.png");
  const name = input.firstName.trim() || "there";

  return {
    subject: "Your LEADMAGPRO account is ready",
    text: buildCredentialsText({
      name,
      email: input.email,
      password: input.password,
      loginUrl,
    }),
    html: buildCredentialsHtml({
      name,
      email: input.email,
      password: input.password,
      loginUrl,
      logoUrl,
    }),
    loginUrl,
  };
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

  const rendered = renderAccountCredentialsEmail({
    firstName: input.firstName,
    email: input.email,
    password: input.password,
  });
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to: input.to,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });

  if (error) {
    console.error("[email] credentials send failed:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

function buildCredentialsText(input: {
  name: string;
  email: string;
  password: string;
  loginUrl: string;
}): string {
  return [
    `Hi ${input.name},`,
    "",
    "Your LEADMAGPRO account has been created. Sign in with these credentials:",
    "",
    `Email: ${input.email}`,
    `Temporary password: ${input.password}`,
    "",
    `Sign in: ${input.loginUrl}`,
    "",
    "We recommend changing your password after your first login.",
    "",
    "— LEADMAGPRO",
  ].join("\n");
}

function buildCredentialsHtml(input: {
  name: string;
  email: string;
  password: string;
  loginUrl: string;
  logoUrl: string;
}): string {
  const name = escapeHtml(input.name);
  const email = escapeHtml(input.email);
  const password = escapeHtml(input.password);
  const loginUrl = escapeHtml(input.loginUrl);
  const logoUrl = escapeHtml(input.logoUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>Your LEADMAGPRO account is ready</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#4338ca 100%);background-color:#4f46e5;padding:28px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <img src="${logoUrl}" width="36" height="36" alt="LEADMAGPRO" style="display:block;border:0;border-radius:8px;background:#ffffff;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#ffffff;">
                      LeadMagPro
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 12px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;letter-spacing:-0.025em;color:#0f172a;">
                Your account is ready
              </h1>
              <p style="margin:0 0 24px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#334155;">
                Hi ${name}, welcome to LEADMAGPRO. Use the credentials below to sign in and start searching.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;margin:0 0 28px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <p style="margin:0 0 14px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#4338ca;">
                      Sign-in details
                    </p>
                    <p style="margin:0 0 6px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#64748b;">
                      Email
                    </p>
                    <p style="margin:0 0 16px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:15px;font-weight:600;color:#0f172a;word-break:break-all;">
                      ${email}
                    </p>
                    <p style="margin:0 0 6px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#64748b;">
                      Temporary password
                    </p>
                    <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:15px;font-weight:600;color:#0f172a;letter-spacing:0.02em;">
                      ${password}
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
                <tr>
                  <td align="center" bgcolor="#4f46e5" style="border-radius:10px;background-color:#4f46e5;">
                    <a href="${loginUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:10px;">
                      Sign in to LEADMAGPRO
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#64748b;">
                We recommend changing your password after your first login.
              </p>
              <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#94a3b8;">
                If the button doesn’t work, copy and paste this link into your browser:<br />
                <a href="${loginUrl}" style="color:#4f46e5;word-break:break-all;">${loginUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;border-top:1px solid #e2e8f0;background-color:#f8fafc;">
              <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
                © ${new Date().getFullYear()} LEADMAGPRO · B2B people search
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
