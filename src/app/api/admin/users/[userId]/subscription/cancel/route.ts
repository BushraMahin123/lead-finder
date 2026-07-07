import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { adminCancelSubscription } from "@/lib/admin-billing";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const { userId } = await context.params;

  let body: { immediate?: boolean; note?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    const result = await adminCancelSubscription({
      userId,
      adminUserId: auth.userId,
      immediate: Boolean(body.immediate),
      note: body.note?.trim() || undefined,
    });

    return NextResponse.json({
      message: body.immediate
        ? "Subscription canceled immediately"
        : "Subscription will cancel at period end",
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel subscription";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
