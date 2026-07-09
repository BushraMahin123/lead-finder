import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type WaitlistBody = {
  email?: unknown;
  name?: unknown;
  company?: unknown;
  role?: unknown;
  useCase?: unknown;
};

function asOptionalString(value: unknown, max = 200): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Waitlist is temporarily unavailable." },
      { status: 503 },
    );
  }

  let body: WaitlistBody;
  try {
    body = (await request.json()) as WaitlistBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = asOptionalString(body.email, 320)?.toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid work email." },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Waitlist is temporarily unavailable." },
      { status: 503 },
    );
  }

  const { error } = await admin.from("waitlist_signups").insert({
    email,
    name: asOptionalString(body.name, 120),
    company: asOptionalString(body.company, 160),
    role: asOptionalString(body.role, 120),
    use_case: asOptionalString(body.useCase, 500),
    source: "landing",
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({
        ok: true,
        alreadyJoined: true,
        message: "You're already on the waitlist. We'll be in touch soon.",
      });
    }

    console.error("Waitlist insert failed:", error.message);
    return NextResponse.json(
      { error: "Could not join the waitlist. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    alreadyJoined: false,
    message: "You're on the list. We'll email you when access opens.",
  });
}
