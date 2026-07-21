/**
 * Reset a provisioned user so they can be invited again.
 *
 * Usage: node scripts/reset-user-invite.mjs itsumairmohsin@gmail.com
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

function loadEnvFile() {
  const envPath = join(rootDir, ".env");
  let content;
  try {
    content = readFileSync(envPath, "utf8");
  } catch {
    return;
  }

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email) {
  console.error("Usage: node scripts/reset-user-invite.mjs <email>");
  process.exit(1);
}

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findAuthUserId(targetEmail) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = (data.users ?? []).find(
      (user) => (user.email ?? "").toLowerCase() === targetEmail,
    );
    if (match) return match.id;

    if (!data.users || data.users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  console.log(`Resetting invite state for ${email}…`);

  const { data: profile } = await admin
    .from("user_profiles")
    .select("user_id, email")
    .eq("email", email)
    .maybeSingle();

  const userId = profile?.user_id ?? (await findAuthUserId(email));

  if (userId) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      throw new Error(`Failed to delete auth user: ${deleteError.message}`);
    }
    console.log(`Deleted auth user ${userId} (cascades profiles/billing/campaigns).`);
  } else {
    console.log("No auth user found for that email.");
  }

  const { data: waitlistRows, error: waitlistError } = await admin
    .from("waitlist_signups")
    .update({
      invited_at: null,
      invited_user_id: null,
    })
    .eq("email", email)
    .select("id, email");

  if (waitlistError) {
    // Columns may not exist yet if migration wasn't applied.
    if (waitlistError.message.includes("invited_at") || waitlistError.message.includes("invited_user_id")) {
      console.warn(
        "Waitlist invite columns missing — run: pnpm db:migrate:waitlist-invites",
      );
    } else {
      throw waitlistError;
    }
  } else if ((waitlistRows ?? []).length > 0) {
    console.log(
      `Cleared invite flags on ${waitlistRows.length} waitlist row(s).`,
    );
  } else {
    console.log("No waitlist row for that email (that's OK).");
  }

  console.log("Done. You can create/invite this user again from Admin.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
