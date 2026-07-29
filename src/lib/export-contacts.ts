import type {
  CampaignColumn,
  CampaignColumnValue,
  ContactRowMeta,
  ContactStatus,
} from "@/types/campaign";
import type { LeadPerson } from "@/types/lead";

export type ExportFormat = "csv" | "excel";

type ExportRow = Record<string, string>;

const STATUS_LABELS: Record<ContactStatus, string> = {
  not_contacted: "Not contacted",
  contacted: "Contacted",
  replied: "Replied",
  meeting: "Meeting",
  no_response: "No response",
  not_interested: "Not interested",
  done: "Done",
};

function displayName(person: LeadPerson): string {
  if (person.name) return person.name;
  return [person.first_name, person.last_name].filter(Boolean).join(" ") || "";
}

function displayPhone(person: LeadPerson): string {
  const phones = person.phone_numbers ?? [];
  return phones
    .map((phone) => phone.sanitized_number || phone.raw_number)
    .filter(Boolean)
    .join(", ");
}

function displayLocation(person: LeadPerson): string {
  const parts = [person.city, person.state, person.country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  const org = person.organization;
  if (!org) return "";
  return [org.city, org.state, org.country].filter(Boolean).join(", ");
}

function statusLabel(status: ContactRowMeta["status"] | undefined): string {
  if (!status) return STATUS_LABELS.not_contacted;
  return STATUS_LABELS[status] ?? status;
}

function sanitizeFilename(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return cleaned || "contacts";
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildContactExportRows(input: {
  people: LeadPerson[];
  contactMeta?: Record<string, ContactRowMeta>;
  aiColumns?: CampaignColumn[];
  columnValues?: Record<string, Record<string, CampaignColumnValue>>;
}): { headers: string[]; rows: ExportRow[] } {
  const {
    people,
    contactMeta = {},
    aiColumns = [],
    columnValues = {},
  } = input;

  const headers = [
    "Name",
    "Title",
    "Status",
    "Done",
    "Notes",
    "Row color",
    "Company",
    "Company domain",
    "Email",
    "Email status",
    "Phone",
    "Location",
    "LinkedIn",
    ...aiColumns.map((column) => column.name),
  ];

  const rows = people.map((person) => {
    const meta = contactMeta[person.id];
    const row: ExportRow = {
      Name: displayName(person),
      Title: person.title ?? "",
      Status: statusLabel(meta?.status),
      Done: meta?.isDone || meta?.status === "done" ? "Yes" : "No",
      Notes: meta?.notes ?? "",
      "Row color": meta?.rowColor ?? "",
      Company: person.organization?.name ?? "",
      "Company domain": person.organization?.primary_domain ?? "",
      Email: person.email ?? "",
      "Email status": person.email_status ?? "",
      Phone: displayPhone(person),
      Location: displayLocation(person),
      LinkedIn: person.linkedin_url ?? "",
    };

    for (const column of aiColumns) {
      const cell = columnValues[person.id]?.[column.id];
      if (cell?.status === "error") {
        row[column.name] = cell.error ? `Error: ${cell.error}` : "Error";
      } else {
        row[column.name] = cell?.value ?? "";
      }
    }

    return row;
  });

  return { headers, rows };
}

function toCsv(headers: string[], rows: ExportRow[]): string {
  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header] ?? "")).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

function toExcelXml(headers: string[], rows: ExportRow[]): string {
  const headerCells = headers
    .map(
      (header) =>
        `<Cell><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`,
    )
    .join("");

  const bodyRows = rows
    .map((row) => {
      const cells = headers
        .map(
          (header) =>
            `<Cell><Data ss:Type="String">${escapeXml(row[header] ?? "")}</Data></Cell>`,
        )
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="Contacts">
  <Table>
   <Row>${headerCells}</Row>
   ${bodyRows}
  </Table>
 </Worksheet>
</Workbook>`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportContacts(input: {
  people: LeadPerson[];
  contactMeta?: Record<string, ContactRowMeta>;
  aiColumns?: CampaignColumn[];
  columnValues?: Record<string, Record<string, CampaignColumnValue>>;
  tableName?: string;
  format: ExportFormat;
}) {
  if (input.people.length === 0) {
    throw new Error("No contacts to export");
  }

  const { headers, rows } = buildContactExportRows(input);
  const baseName = sanitizeFilename(input.tableName ?? "contacts");

  if (input.format === "csv") {
    downloadBlob(
      new Blob([toCsv(headers, rows)], {
        type: "text/csv;charset=utf-8;",
      }),
      `${baseName}.csv`,
    );
    return;
  }

  downloadBlob(
    new Blob([toExcelXml(headers, rows)], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    }),
    `${baseName}.xls`,
  );
}
