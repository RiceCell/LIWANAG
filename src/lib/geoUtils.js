import * as turf from '@turf/turf';

// Given a lat/lng and the cebu-city.json FeatureCollection, returns the
// `adm4_name` (barangay name) property of whichever polygon contains the
// point, or "Outside Cebu City" if nothing matches.
export function getBarangayFromCoords(lat, lng, geoJsonData) {
    if (!geoJsonData?.features?.length) return 'Outside Cebu City';
    if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
        return 'Outside Cebu City';
    }

    // GeoJSON coordinate order is [longitude, latitude]
    const point = turf.point([lng, lat]);

    for (const feature of geoJsonData.features) {
        try {
            if (turf.booleanPointInPolygon(point, feature)) {
                // FIXED: Changed to adm4_name to match your map file perfectly
                return feature.properties?.adm4_name || 'Outside Cebu City';
            }
        } catch (err) {
            console.warn('getBarangayFromCoords: skipping unmatchable feature', err);
        }
    }

    return 'Outside Cebu City';
}

// Shared by RefugeMap.jsx and ReportBrownout.jsx
// Pulls every `adm4_name` property out of the FeatureCollection, drops blanks and
// duplicates, and sorts alphabetically.
export function extractBarangayNames(geoJsonData) {
    if (!geoJsonData?.features?.length) return [];

    const names = geoJsonData.features
        // FIXED: Changed to adm4_name to match your map file perfectly
        .map((feature) => feature.properties?.adm4_name)
        .filter((name) => typeof name === 'string' && name.trim().length > 0);

    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}