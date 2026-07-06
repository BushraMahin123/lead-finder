"use client";

import { useState } from "react";
import { AI_COLUMN_VARIABLES } from "@/lib/ai-column-prompt";

interface AddAiColumnModalProps {
  open: boolean;
  saving?: boolean;
  initialName?: string;
  initialPrompt?: string;
  title?: string;
  onClose: () => void;
  onSave: (input: { name: string; prompt: string }) => void | Promise<void>;
}

export default function AddAiColumnModal({
  open,
  saving = false,
  initialName = "",
  initialPrompt = "",
  title = "Add AI column",
  onClose,
  onSave,
}: AddAiColumnModalProps) {
  const [name, setName] = useState(initialName);
  const [prompt, setPrompt] = useState(initialPrompt);

  if (!open) return null;

  function insertVariable(key: string) {
    setPrompt((current) => {
      const token = `{{${key}}}`;
      return current.trim() ? `${current.trim()} ${token}` : token;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedPrompt = prompt.trim();
    if (!trimmedName || !trimmedPrompt || saving) return;
    await onSave({ name: trimmedName, prompt: trimmedPrompt });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">
          Write a prompt using row data. We&apos;ll run it per contact with AI
          and fill the column.
        </p>

        <label className="mt-5 block text-sm font-medium text-slate-700">
          Column name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Pain point, ICP fit, Outreach angle"
            className="input-field mt-1.5"
            disabled={saving}
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          AI prompt
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={5}
            disabled={saving}
            placeholder="Based on {{title}} at {{company}}, write a one-sentence pain point they likely face."
            className="input-field mt-1.5 resize-none"
          />
        </label>

        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Insert row variables
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {AI_COLUMN_VARIABLES.map((variable) => (
              <button
                key={variable.key}
                type="button"
                disabled={saving}
                onClick={() => insertVariable(variable.key)}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                {`{{${variable.key}}}`}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim() || !prompt.trim()}
            className="btn btn-primary"
          >
            {saving ? "Saving…" : "Save column"}
          </button>
        </div>
      </form>
    </div>
  );
}
