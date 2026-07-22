export const PUROKS = ['Purok 1', 'Purok 2', 'Purok 3', 'Purok 4', 'Purok 5', 'Purok 6', 'Purok 7'];

// The LGU console's heatmap and purok chart now read from `brownout_reports`,
// which has its own `purok` field (collected via a plain text input in
// ReportBrownout.jsx — "e.g. Purok 1", not a dropdown). It's *structured*
// compared to the old free-text `outage_reports.street` ("Purok 2, Zapatera
// St."), but a citizen can still type "purok1", "Purok  3", etc., so this
// normalizes it to one of the canonical PUROKS labels rather than trusting
// it verbatim. Falls back to 'Unassigned' if nothing matches.
export function normalizePurok(rawPurok = '') {
    const match = String(rawPurok).match(/purok\s*(\d+)/i);
    if (!match) return 'Unassigned';
    const label = `Purok ${match[1]}`;
    return PUROKS.includes(label) ? label : 'Unassigned';
}

// Kept for backward compatibility — this was the original helper for
// pulling a purok out of `outage_reports.street` free text. Nothing in the
// gov console calls this anymore now that the heatmap/chart read from
// `brownout_reports.purok` via normalizePurok() above. Safe to delete once
// `outage_reports` is fully retired (see project notes on the two-table
// reconciliation).
export function extractPurok(street = '') {
    const match = street.match(/purok\s*\d+/i);
    if (!match) return 'Unassigned';
    return match[0].replace(/purok/i, 'Purok').replace(/\s+/, ' ');
}