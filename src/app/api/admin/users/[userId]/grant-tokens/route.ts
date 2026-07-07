import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { grantTokensAsAdmin } from "@/lib/admin-data";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const { userId } = await context.params;

  let body: { amount?: number; description?: string };
  try {
    body = (await request.json()) as { amount?: number; description?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount === 0) {
    return NextResponse.json(
      { error: "Amount must be a non-zero number" },
      { status: 400 },
    );
  }

  if (Math.abs(amount) > 1_000_000) {
    return NextResponse.json(
      { error: "Amount exceeds the maximum allowed per grant" },
      { status: 400 },
    );
  }

  try {
    const result = await grantTokensAsAdmin({
      targetUserId: userId,
      adminUserId: auth.userId,
      amount,
      description: body.description?.trim() || undefined,
    });

    return NextResponse.json({
      balance: result.balance,
      message:
        amount > 0
          ? `Granted ${amount.toLocaleString()} tokens`
          : `Removed ${Math.abs(amount).toLocaleString()} tokens`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to grant tokens";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
