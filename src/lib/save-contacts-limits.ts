/** Suggested quick-select amounts (filtered by available matches in the UI). */
export const SAVE_AMOUNT_PRESETS = [
  100, 250, 500, 1_000, 2_500, 5_000, 10_000,
] as const;

/**
 * Max contacts allowed in a single save action.
 * Saving more from the same search should be done in the same table,
 * which resumes from the next unsaved contacts.
 */
export const SAVE_CONTACTS_PER_REQUEST = 10_000;
