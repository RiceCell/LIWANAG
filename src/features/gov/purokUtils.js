export const PUROKS = ['Purok 1', 'Purok 2', 'Purok 3', 'Purok 4', 'Purok 5', 'Purok 6', 'Purok 7'];

// outage_reports.street is free text today (e.g. "Purok 2, Zapatera St."),
// so this pulls a purok label out of it for grouping on the heatmap and
// report chart. If/when outage_reports gets its own `purok` column, swap
// call sites over to reading that column directly and delete this.
export function extractPurok(street = '') {
    const match = street.match(/purok\s*\d+/i);
    if (!match) return 'Unassigned';
    return match[0].replace(/purok/i, 'Purok').replace(/\s+/, ' ');
}
