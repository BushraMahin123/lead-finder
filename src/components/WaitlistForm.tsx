"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, company, role }),
      });
      const data = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      setMessage(data.message ?? "You're on the list.");
      setEmail("");
      setName("");
      setCompany("");
      setRole("");
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 text-left">
        <p className="text-sm font-semibold text-emerald-900">You&apos;re on the list</p>
        <p className="mt-2 text-sm leading-relaxed text-emerald-800">
          {message}
        </p>
        <button
          type="button"
          className="btn btn-secondary mt-4"
          onClick={() => {
            setStatus("idle");
            setMessage(null);
          }}
        >
          Add another email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-left">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">
            Work email
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="input-field"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">
            Name <span className="text-slate-400">(optional)</span>
          </span>
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Rivera"
            className="input-field"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">
            Company <span className="text-slate-400">(optional)</span>
          </span>
          <input
            type="text"
            autoComplete="organization"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Inc"
            className="input-field"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">
            Role <span className="text-slate-400">(optional)</span>
          </span>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="SDR, Founder, Growth…"
            className="input-field"
          />
        </label>
      </div>

      {message && status === "error" ? (
        <p className="text-sm text-red-600" role="alert">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "loading"}
        className="btn btn-primary w-full px-6 py-3 text-base"
      >
        {status === "loading" ? "Joining…" : "Join the waitlist"}
      </button>
      <p className="text-center text-xs text-slate-500">
        No spam. We&apos;ll only email you when early access opens.
      </p>
    </form>
  );
}
