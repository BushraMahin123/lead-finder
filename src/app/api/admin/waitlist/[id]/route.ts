import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import {
  deleteWaitlistSignup,
  inviteWaitlistSignupAsAdmin,
} from "@/lib/admin-accounts";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    await deleteWaitlistSignup(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete signup";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  let body: { password?: string; sendEmail?: boolean } = {};
  try {
    body = (await request.json()) as { password?: string; sendEmail?: boolean };
  } catch {
    // Empty body is fine — defaults apply.
  }

  try {
    const result = await inviteWaitlistSignupAsAdmin({
      signupId: id,
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
