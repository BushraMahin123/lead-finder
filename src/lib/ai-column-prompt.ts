import { createHash } from "crypto";
import type { LeadPerson } from "@/types/lead";

export const AI_COLUMN_VARIABLES = [
  { key: "name", label: "Full name" },
  { key: "title", label: "Job title" },
  { key: "company", label: "Company name" },
  { key: "domain", label: "Company domain" },
  { key: "email", label: "Email" },
  { key: "location", label: "Location" },
  { key: "linkedin", label: "LinkedIn URL" },
  { key: "industry", label: "Industry" },
  { key: "seniority", label: "Seniority" },
] as const;

function displayName(person: LeadPerson): string {
  if (person.name) return person.name;
  return [person.first_name, person.last_name].filter(Boolean).join(" ");
}

function displayLocation(person: LeadPerson): string {
  const parts = [person.city, person.state, person.country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  const org = person.organization;
  if (!org) return "";
  return [org.city, org.state, org.country].filter(Boolean).join(", ");
}

export function buildPersonVariables(person: LeadPerson): Record<string, string> {
  const org = person.organization;
  return {
    name: displayName(person),
    title: person.title ?? "",
    company: org?.name ?? "",
    domain: org?.primary_domain ?? "",
    email: person.email ?? "",
    location: displayLocation(person),
    linkedin: person.linkedin_url ?? "",
    industry: org?.industry ?? "",
    seniority: person.seniority ?? "",
  };
}

export function interpolatePrompt(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_match, key: string) => {
    return variables[key.toLowerCase()] ?? "";
  });
}

export function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt.trim()).digest("hex");
}

export function buildAiColumnSystemPrompt(): string {
  return `You enrich B2B lead research cells for a spreadsheet.

Return ONLY the cell value as plain text — no markdown, no JSON, no labels, no preamble.
Keep answers concise (1-3 sentences max unless the user prompt asks for more).
If you cannot determine a value from the context, return "Unknown".`;
}
