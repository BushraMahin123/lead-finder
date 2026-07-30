import { NextRequest, NextResponse } from "next/server";
import { getFromAddress, isEmailConfigured, sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildContactEmailHtml(data: ContactFormData): string {
  const name = escapeHtml(data.name);
  const email = escapeHtml(data.email);
  const subject = escapeHtml(data.subject);
  const message = escapeHtml(data.message).replace(/\n/g, "<br />");
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>New Contact Form Submission</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#4338ca 100%);background-color:#4f46e5;padding:28px 32px;">
              <h1 style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#ffffff;">
                New Contact Form Submission
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 24px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#64748b;">
                You received a new message through the contact form.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:0 0 24px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <p style="margin:0 0 8px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">
                      From
                    </p>
                    <p style="margin:0 0 16px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#0f172a;">
                      ${name}
                    </p>
                    <p style="margin:0 0 8px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">
                      Email
                    </p>
                    <p style="margin:0 0 16px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#0f172a;">
                      ${email}
                    </p>
                    <p style="margin:0 0 8px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">
                      Subject
                    </p>
                    <p style="margin:0 0 16px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#0f172a;">
                      ${subject}
                    </p>
                    <p style="margin:0 0 8px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">
                      Date
                    </p>
                    <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#0f172a;">
                      ${date}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 12px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">
                Message
              </p>
              <div style="background-color:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:0 0 24px;">
                <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#334155;">
                  ${message}
                </p>
              </div>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="#4f46e5" style="border-radius:10px;background-color:#4f46e5;">
                    <a href="mailto:${email}" style="display:inline-block;padding:14px 28px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:10px;">
                      Reply to ${name}
                    </a>
                  </td>
                </tr>
              </table>
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

function buildContactEmailText(data: ContactFormData): string {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return [
    "New Contact Form Submission",
    "",
    `From: ${data.name}`,
    `Email: ${data.email}`,
    `Subject: ${data.subject}`,
    `Date: ${date}`,
    "",
    "Message:",
    data.message,
    "",
    "— LEADMAGPRO",
  ].join("\n");
}

function getContactRecipientAddress(): string {
  const configured = process.env.CONTACT_EMAIL_TO?.replace(/\s+/g, "").trim();
  if (configured) return configured;

  const fromAddress = getFromAddress();
  const bracketedAddress = fromAddress.match(/<([^<>]+)>$/)?.[1]?.trim();
  if (bracketedAddress) return bracketedAddress;

  return fromAddress.includes("@")
    ? fromAddress
    : "contact@leadmagpro.com";
}

export async function POST(request: NextRequest) {
  try {
    const body: ContactFormData = await request.json();

    console.log("[contact] Received form submission:", { name: body.name, email: body.email });

    // Validate required fields
    if (!body.name || !body.email || !body.subject || !body.message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Check if email is configured
    if (!isEmailConfigured()) {
      console.error("[contact] Email not configured - RESEND_API_KEY missing");
      return NextResponse.json(
        { error: "Email service not configured. Please contact support directly." },
        { status: 500 }
      );
    }

    const toEmail = getContactRecipientAddress();
    console.log("[contact] Sending to:", toEmail);

    const html = buildContactEmailHtml(body);
    const text = buildContactEmailText(body);

    const result = await sendEmail({
      to: toEmail,
      subject: `Contact Form: ${body.subject} - ${body.name}`,
      text,
      html,
      replyTo: body.email,
    });

    if (!result.ok) {
      console.error("[contact] Email send failed:", result.error);
      return NextResponse.json(
        { error: `Failed to send message: ${result.error}` },
        { status: 500 }
      );
    }

    console.log("[contact] Email sent successfully");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[contact] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `An unexpected error occurred: ${errorMessage}` },
      { status: 500 }
    );
  }
}
