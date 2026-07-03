import { createClient } from "@/lib/supabase/server";

export default async function UserMenu() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email =
    typeof data?.claims?.email === "string" ? data.claims.email : null;

  if (!email) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden max-w-[12rem] truncate text-sm text-slate-600 sm:inline">
        {email}
      </span>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
