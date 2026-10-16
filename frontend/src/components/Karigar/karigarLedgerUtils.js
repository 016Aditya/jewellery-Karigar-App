// Shared constants/helpers for the Karigar Gold Ledger detail screen — split out of the
// page component so both the page and its child components (table, form, export dialogs)
// can import the same single source of truth instead of duplicating formatting logic.

export const API_BASE_URL = "http://localhost:8090/api";

export const ASSET_CLASSES = [
  { value: "GOLD", label: "Gold" },
  { value: "SILVER", label: "Silver" },
  { value: "PLATINUM", label: "Platinum" },
];

export const TOLERANCE = 0.0005;

// No date field here — the server always stamps the entry with its own current date
// (never trusts a client-computed "today", which drifts a day off in timezones ahead
// of UTC like IST for several hours after local midnight).
export const EMPTY_FORM = {
  grossWeight: "",
  purity: "",
  jobCard: "",
  description: "",
};

// Steps shown inside the export progress modal. The first four are timer-driven purely
// for visual feedback (the "Agentic AI" typing effect); the last is tied to the real
// network round trip (backend Excel generation + download) and stays active until that
// actually resolves.
export const EXPORT_STEPS = [
  "Finding the data in DB",
  "Collecting transaction records",
  "Organising columns in Excel",
  "Preparing workbook",
  "Finalising & downloading",
];

export const toIsoDate = (d) => d.toISOString().slice(0, 10);

export const f4 = (n) => Number(n || 0).toFixed(4);
export const f6 = (n) => Number(n || 0).toFixed(6);

// Merges Issue + Return rows into one chronological ledger, oldest first, each carrying a
// running balance — reads like a real bank/ledger statement instead of two separate tables.
// `openingBalance` seeds the running total with whatever balance existed just before the
// oldest *visible* entry (the entries list is windowed to the last 3 months), so the
// running balance on the last row always lands on the absolute, DB-authoritative balance —
// not on a number that only accounts for what happens to still be in view.
export const buildLedgerRows = (entries, openingBalance = 0) => {
  const sorted = [...entries].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id - b.id,
  );
  let running = openingBalance;
  return sorted.map((e, i) => {
    running +=
      e.entryType === "ISSUE" ? Number(e.fineWeight) : -Number(e.fineWeight);
    return { ...e, idx: i + 1, runningBalance: running };
  });
};
