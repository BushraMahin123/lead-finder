import { renderAccountCredentialsEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export default function AdminEmailPreviewPage() {
  const preview = renderAccountCredentialsEmail({
    firstName: "Umair",
    email: "itsumairmohsin@gmail.com",
    password: "TempPass-Example1",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Email preview
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Local preview of the account credentials email. Subject:{" "}
          <span className="font-medium text-slate-800">{preview.subject}</span>
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <iframe
          title="Credentials email preview"
          srcDoc={preview.html}
          className="h-[760px] w-full border-0 bg-slate-50"
        />
      </div>
    </div>
  );
}
