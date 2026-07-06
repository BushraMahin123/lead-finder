import {
  COMPANY_SIZE_OPTIONS,
  INDUSTRY_OPTIONS,
  USE_CASE_OPTIONS,
} from "@/lib/signup/options";

type WorkspaceProfileFieldsProps = {
  firstName?: string;
  lastName?: string;
  email?: string;
  readOnlyEmail?: boolean;
  includeIdentityFields?: boolean;
};

export default function WorkspaceProfileFields({
  firstName = "",
  lastName = "",
  email = "",
  readOnlyEmail = false,
  includeIdentityFields = true,
}: WorkspaceProfileFieldsProps) {
  return (
    <>
      {includeIdentityFields && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="First name"
              id="first_name"
              name="first_name"
              defaultValue={firstName}
              placeholder="Jane"
              autoComplete="given-name"
              required
            />
            <Field
              label="Last name"
              id="last_name"
              name="last_name"
              defaultValue={lastName}
              placeholder="Smith"
              autoComplete="family-name"
              required
            />
          </div>

          <Field
            label="Work email"
            id="email"
            name="email"
            type="email"
            defaultValue={email}
            placeholder="you@company.com"
            autoComplete="email"
            required
            readOnly={readOnlyEmail}
          />
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Company name"
          id="company_name"
          name="company_name"
          placeholder="Acme Inc."
          autoComplete="organization"
          required
        />
        <Field
          label="Job title"
          id="job_title"
          name="job_title"
          placeholder="Head of Sales"
          autoComplete="organization-title"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="company_size" className="label">
            Company size
          </label>
          <select
            id="company_size"
            name="company_size"
            required
            defaultValue=""
            className="input-field"
          >
            <option value="" disabled>
              Select size
            </option>
            {COMPANY_SIZE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="industry" className="label">
            Industry
          </label>
          <select
            id="industry"
            name="industry"
            required
            defaultValue=""
            className="input-field"
          >
            <option value="" disabled>
              Select industry
            </option>
            {INDUSTRY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="use_case" className="label">
            Primary use case
          </label>
          <select
            id="use_case"
            name="use_case"
            required
            defaultValue=""
            className="input-field"
          >
            <option value="" disabled>
              How will you use Lead Finder?
            </option>
            {USE_CASE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <Field
          label="Country (optional)"
          id="country"
          name="country"
          placeholder="United States"
          autoComplete="country-name"
        />
      </div>

      <Field
        label="Phone (optional)"
        id="phone"
        name="phone"
        type="tel"
        placeholder="+1 555 000 0000"
        autoComplete="tel"
      />

      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 text-sm leading-relaxed text-slate-600">
        <input
          type="checkbox"
          name="marketing_opt_in"
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span>Send me product updates, tips, and occasional offers.</span>
      </label>
    </>
  );
}

function Field({
  label,
  id,
  name,
  type = "text",
  placeholder,
  autoComplete,
  required,
  defaultValue,
  readOnly,
}: {
  label: string;
  id: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        readOnly={readOnly}
        className={`input-field ${readOnly ? "bg-slate-50 text-slate-600" : ""}`}
      />
    </div>
  );
}
