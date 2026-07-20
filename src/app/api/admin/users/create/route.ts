import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { createUserAccountAsAdmin } from "@/lib/admin-accounts";

type CreateBody = {
  email?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  jobTitle?: string;
  password?: string;
  sendEmail?: boolean;
};

export async function POST(request: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const result = await createUserAccountAsAdmin({
      email,
      firstName: body.firstName,
      lastName: body.lastName,
      companyName: body.companyName,
      jobTitle: body.jobTitle,
      password: body.password,
      sendEmail: body.sendEmail,
    });

    return NextResponse.json({
      ...result,
      message: result.emailSent
        ? `Account created and credentials emailed to ${result.email}`
        : `Account created for ${result.email}`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
