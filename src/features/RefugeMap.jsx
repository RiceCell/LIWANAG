import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, ZoomControl, useMapEvents, GeoJSON } from 'react-leaflet';
import {
    Search, Zap, PlusSquare, ThermometerSnowflake, Navigation,
    Plus, X, ShieldCheck, MapPinPlus, TriangleAlert, Check, Loader2
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../lib/supabase';

const CACHE_KEY = 'liwanag-refuges-cache';
const DEFAULT_CENTER = [10.3157, 123.8854];

const SERVICE_META = {
    charging: { icon: Zap, label: 'Charging', color: 'text-blue-500', bg: 'bg-blue-50' },
    medical: { icon: PlusSquare, label: 'Medical', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    cooling: { icon: ThermometerSnowflake, label: 'Cool Storage', color: 'text-cyan-500', bg: 'bg-cyan-50' },
};

// Stroke-only path data matching the lucide icons used everywhere else,
// so the marker's inner glyph reads as the same icon language.
const MARKER_GLYPHS = {
    charging: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    medical: '<path d="M12 5v14M5 12h14"/>',
    cooling: '<path d="M12 2v20M4.2 7l15.6 10M4.2 17l15.6-10"/>',
};

// 🆕 A custom red warning triangle icon for emergencies
const emergencyIcon = L.divIcon({
    html: `<div style="background-color: #ef4444; border: 2px solid white; border-radius: 50%; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
         </div>`,
    className: '', // We leave this empty to prevent default Leaflet styles from messing it up
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

let pulseStyleInjected = false;
function ensurePulseKeyframes() {
    if (pulseStyleInjected || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.textContent = `
        @keyframes liwanag-marker-pulse {
            0%   { transform: scale(0.9); opacity: 0.45; }
            70%  { transform: scale(1.6); opacity: 0; }
            100% { transform: scale(1.6); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    pulseStyleInjected = true;
}

// A rounded "beacon" badge instead of a teardrop map pin — it reads as
// part of this app's language (same shape family as the Dynamic Island
// and the sheet buttons) rather than a generic Google-Maps-style marker.
// Color communicates verification, the glyph communicates the primary
// service, and a soft pulse marks a point that's currently powered.
function buildIcon(point) {
    ensurePulseKeyframes();
    const primaryService = point.services?.[0] || 'charging';
    const glyph = MARKER_GLYPHS[primaryService] || MARKER_GLYPHS.charging;
    const isOffline = point.status === 'offline';
    const fill = isOffline ? '#94a3b8' : point.verified ? '#2563eb' : '#f59e0b';

    const pulse = !isOffline
        ? `<div style="position:absolute;inset:0;border-radius:12px;background:${fill};animation:liwanag-marker-pulse 2.4s ease-out infinite;"></div>`
        : '';

    const verifiedBadge = point.verified
        ? `<div style="position:absolute;top:-5px;right:-5px;width:15px;height:15px;border-radius:9999px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.3);">
             <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
           </div>`
        : '';

    return L.divIcon({
        className: '',
        html: `
            <div style="position:relative;width:32px;height:32px;">
                ${pulse}
                <div style="position:relative;width:32px;height:32px;border-radius:12px;background:${fill};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;${isOffline ? 'opacity:0.8;' : ''}">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${glyph}</svg>
                </div>
                ${verifiedBadge}
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16], // centered — this is a beacon, not a pin with a pointed tip
    });
}

function MapClickCatcher({ onMapClick }) {
    useMapEvents({ click: onMapClick });
    return null;
}

export default function RefugeMap() {
    const [refuges, setRefuges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRefuge, setSelectedRefuge] = useState(null);
    const [fabOpen, setFabOpen] = useState(false);
    const [activeSheet, setActiveSheet] = useState(null); // 'add' | 'added-confirmation' | null

    const [reports, setReports] = useState([]); // 🆕 Active reports state
    const [geoData, setGeoData] = useState(null); // 🆕 GeoJSON map state

    // 🆕 Fetch the GeoJSON map boundaries
    useEffect(() => {
        fetch('/cebu-city.json')
            .then(response => response.json())
            .then(data => setGeoData(data))
            .catch(error => console.error("Error loading barangay map:", error));
    }, []);

    // 🆕 Fetch active emergencies
    useEffect(() => {
        const fetchReports = async () => {
            const { data, error } = await supabase
                .from('brownout_reports')
                .select('*')
                .eq('status', 'active');

            if (error) {
                console.error("Failed to fetch reports:", error);
            } else {
                setReports(data || []);
            }
        };

        fetchReports();
    }, []);

    // Initial load — falls back to whatever was last cached on this phone
    // if the network call fails, which is the whole point of a brownout app.
    useEffect(() => {
        let ignore = false;
        (async () => {
            const { data, error } = await supabase
                .from('refuge_points')
                .select('*')
                .order('created_at', { ascending: true });

            if (ignore) return;

            if (error) {
                setLoadError(error.message);
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) setRefuges(JSON.parse(cached));
            } else {
                setRefuges(data);
                localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            }
            setLoading(false);
        })();
        return () => { ignore = true; };
    }, []);

    // Live updates — other citizens' reports and barangay verifications
    // show up on this map without a refresh.
    useEffect(() => {
        const channel = supabase
            .channel('refuge_points_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'refuge_points' }, (payload) => {
                setRefuges((prev) => {
                    let next = prev;
                    if (payload.eventType === 'INSERT') next = [...prev, payload.new];
                    if (payload.eventType === 'UPDATE') next = prev.map((r) => (r.id === payload.new.id ? payload.new : r));
                    if (payload.eventType === 'DELETE') next = prev.filter((r) => r.id !== payload.old.id);
                    localStorage.setItem(CACHE_KEY, JSON.stringify(next));
                    return next;
                });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const filteredRefuges = useMemo(() => refuges.filter((refuge) => {
        const matchesFilter = activeFilter === 'all' || refuge.services.includes(activeFilter);
        const matchesSearch = refuge.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    }), [refuges, activeFilter, searchQuery]);

    const closeAllSheets = () => {
        setSelectedRefuge(null);
        setActiveSheet(null);
        setFabOpen(false);
    };

    const handleAddRefuge = async (entry) => {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('refuge_points').insert({
            name: entry.name,
            // Placeholder jitter around the barangay center until this is
            // wired to the device's actual location (navigator.geolocation).
            lat: DEFAULT_CENTER[0] + (Math.random() - 0.5) * 0.006,
            lng: DEFAULT_CENTER[1] + (Math.random() - 0.5) * 0.006,
            power: entry.power,
            services: entry.services,
            verified: false,
            status: 'online',
            created_by: user?.id ?? null,
        });

        if (error) throw error;
        setActiveSheet('added-confirmation');
    };

    // NOTE: outage reporting used to go through a handleReportOutage()
    // function here that inserted into the legacy `outage_reports` table via
    // a bottom sheet. "Report an outage" now launches the full-screen
    // ReportBrownout flow instead (writes to `brownout_reports` directly),
    // so that function and its sheet were removed rather than left unused.

    return (
        <div className="w-full h-full relative">
            {/* 1. TOP OVERLAY: Search & Status */}
            <div className="absolute top-24 left-0 right-0 z-[400] px-4 pointer-events-none flex flex-col gap-3">
                <div className="pointer-events-auto bg-white rounded-2xl shadow-lg flex items-center px-4 py-3 border border-slate-100">
                    <Search size={20} className="text-slate-400 mr-3 shrink-0" />
                    <input
                        type="text"
                        placeholder="Search nearest points..."
                        aria-label="Search refuge points"
                        className="w-full outline-none text-slate-700 bg-transparent text-sm placeholder:text-slate-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} aria-label="Clear search" className="text-slate-300 hover:text-slate-500">
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="pointer-events-auto bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-3 border border-slate-100 w-2/3 max-w-xs">
                    <p className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mb-1">Current Position</p>
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                        <Navigation size={14} className="text-blue-500" /> Purok 1, Cebu City
                    </p>
                    <hr className="my-2 border-slate-200" />
                    <p className="text-xs font-medium text-slate-600">
                        {loading ? (
                            <span className="text-slate-400">Loading points…</span>
                        ) : (
                            <>
                                <span className="text-blue-600 font-bold">{filteredRefuges.length}</span> point{filteredRefuges.length === 1 ? '' : 's'} nearby
                            </>
                        )}
                    </p>
                </div>

                {loadError && (
                    <div className="pointer-events-auto bg-amber-50 text-amber-700 border border-amber-200 text-xs px-3 py-2 rounded-xl w-fit max-w-xs">
                        Couldn't reach the server — showing the last saved copy on this phone.
                    </div>
                )}
            </div>

            {/* 2. FLOATING ACTION BUTTON: report + add, the two core citizen actions.
                bottom-60 (not bottom-40) to clear the bottom nav footer added in AppLayout. */}
            <div className="absolute right-4 bottom-60 z-[400] flex flex-col items-end gap-3">
                {fabOpen && (
                    <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <button
                            onClick={() => {
                                // This used to open a bottom-sheet form posting to the
                                // legacy `outage_reports` table. It now launches the
                                // full-screen, GPS-based ReportBrownout flow instead —
                                // same custom event the old standalone red button used.
                                setFabOpen(false);
                                window.dispatchEvent(new CustomEvent('open-report'));
                            }}
                            className="flex items-center gap-2 bg-white shadow-lg rounded-full pl-4 pr-2 py-2 text-sm font-semibold text-slate-700 border border-slate-100"
                        >
                            Report an outage
                            <span className="w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                                <TriangleAlert size={16} />
                            </span>
                        </button>
                        <button
                            onClick={() => { setActiveSheet('add'); setFabOpen(false); }}
                            className="flex items-center gap-2 bg-white shadow-lg rounded-full pl-4 pr-2 py-2 text-sm font-semibold text-slate-700 border border-slate-100"
                        >
                            Tag a power source
                            <span className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                <MapPinPlus size={16} />
                            </span>
                        </button>
                    </div>
                )}
                <button
                    onClick={() => setFabOpen((v) => !v)}
                    aria-label={fabOpen ? 'Close quick actions' : 'Open quick actions'}
                    className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 ${fabOpen ? 'bg-slate-800 rotate-45' : 'bg-brand-500'}`}
                >
                    <Plus className="text-white" size={26} />
                </button>
            </div>

            {/* 3. BOTTOM OVERLAY: Available Services Filters.
                bottom-24 (not bottom-6) to clear the bottom nav footer added in AppLayout. */}
            <div className="absolute bottom-24 left-0 right-0 z-[400] px-4 pointer-events-none">
                <div className="pointer-events-auto bg-white rounded-3xl shadow-xl p-4 border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800 mb-3 ml-1">Available Services</h4>
                    <div className="flex justify-between gap-2">
                        <FilterButton
                            active={activeFilter === 'charging'}
                            onClick={() => setActiveFilter(activeFilter === 'charging' ? 'all' : 'charging')}
                            icon={<Zap size={20} />}
                            label="Charging"
                            color="text-blue-500"
                            bgColor="bg-blue-50"
                        />
                        <FilterButton
                            active={activeFilter === 'medical'}
                            onClick={() => setActiveFilter(activeFilter === 'medical' ? 'all' : 'medical')}
                            icon={<PlusSquare size={20} />}
                            label="Medical"
                            color="text-emerald-500"
                            bgColor="bg-emerald-50"
                        />
                        <FilterButton
                            active={activeFilter === 'cooling'}
                            onClick={() => setActiveFilter(activeFilter === 'cooling' ? 'all' : 'cooling')}
                            icon={<ThermometerSnowflake size={20} />}
                            label="Cool Storage"
                            color="text-cyan-500"
                            bgColor="bg-cyan-50"
                        />
                    </div>
                    {!loading && filteredRefuges.length === 0 && (
                        <p className="text-xs text-slate-400 text-center mt-3">
                            No points match that filter yet — try "Tag a power source" above to add one.
                        </p>
                    )}
                </div>
            </div>

            {/* 4. THE LEAFLET MAP */}
            <MapContainer
                center={DEFAULT_CENTER}
                zoom={15}
                scrollWheelZoom={true}
                zoomControl={false}
                className="w-full h-full z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* 🆕 THE GEOJSON BOUNDARIES */}
                {geoData && (
                    <GeoJSON
                        data={geoData}
                        style={{
                            color: '#3b82f6',
                            weight: 2,
                            fillColor: '#93c5fd',
                            fillOpacity: 0.1
                        }}
                    />
                )}

                <ZoomControl position="bottomright" />
                <MapClickCatcher onMapClick={closeAllSheets} />

                {/* Existing Evacuation Centers */}
                {filteredRefuges.map((point) => (
                    <Marker
                        key={point.id}
                        position={[point.lat, point.lng]}
                        icon={buildIcon(point)}
                        eventHandlers={{ click: () => setSelectedRefuge(point) }}
                    />
                ))}

                {/* 🆕 New Brownout / Emergency Reports */}
                {reports.map((report) => (
                    <Marker
                        key={report.id}
                        position={[report.lat, report.lng]}
                        icon={emergencyIcon}
                        eventHandlers={{
                            click: () => {
                                alert(`Emergency reported at ${report.purok}! \nNotes: ${report.notes || 'None'}`);
                            }
                        }}
                    />
                ))}
            </MapContainer>

            {/* 5. BOTTOM SHEETS */}
            {selectedRefuge && (
                <RefugeDetailSheet refuge={selectedRefuge} onClose={closeAllSheets} />
            )}
            {activeSheet === 'add' && (
                <AddRefugeSheet onClose={closeAllSheets} onSubmit={handleAddRefuge} />
            )}
            {activeSheet === 'added-confirmation' && (
                <ConfirmationSheet
                    message="Thanks — your power source is now on the map as unverified. Your barangay will confirm it soon."
                    onClose={closeAllSheets}
                />
            )}
        </div>
    );
}

function SheetShell({ children, onClose }) {
    return (
        <div className="fixed inset-0 z-[500] flex flex-col justify-end" onClick={onClose}>
            <div className="absolute inset-0 bg-slate-900/30 animate-in fade-in duration-200" />
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative bg-white rounded-t-3xl shadow-2xl p-6 pb-8 animate-in slide-in-from-bottom duration-300 max-h-[75vh] overflow-y-auto"
            >
                <div className="w-10 h-1.5 bg-slate-200 rounded-full mx-auto mb-5" />
                {children}
            </div>
        </div>
    );
}

function RefugeDetailSheet({ refuge, onClose }) {
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${refuge.lat},${refuge.lng}`;
    return (
        <SheetShell onClose={onClose}>
            <div className="flex items-start justify-between mb-1">
                <h3 className="text-lg font-extrabold text-slate-800 pr-4">{refuge.name}</h3>
                <button onClick={onClose} aria-label="Close" className="text-slate-300 hover:text-slate-500 shrink-0">
                    <X size={20} />
                </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
                {refuge.verified ? (
                    <span className="flex items-center gap-1 bg-blue-100 text-blue-700 text-[10px] px-2 py-1 rounded-full font-bold">
                        <ShieldCheck size={12} /> BARANGAY VERIFIED
                    </span>
                ) : (
                    <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-1 rounded-full font-bold">
                        UNVERIFIED — REPORTED BY A NEIGHBOR
                    </span>
                )}
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${refuge.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {refuge.status === 'online' ? 'POWER ONLINE' : 'REPORTED OFFLINE'}
                </span>
            </div>

            <p className="text-sm text-slate-500 mb-4">Power source: {refuge.power || 'Unknown'}</p>

            <div className="flex gap-2 mb-6">
                {refuge.services.map((s) => {
                    const meta = SERVICE_META[s];
                    if (!meta) return null;
                    const Icon = meta.icon;
                    return (
                        <div key={s} className={`flex items-center gap-1.5 ${meta.bg} ${meta.color} text-xs font-semibold px-3 py-1.5 rounded-full`}>
                            <Icon size={14} /> {meta.label}
                        </div>
                    );
                })}
            </div>

            <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-brand-500 hover:bg-brand-900 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all"
            >
                <Navigation size={18} /> Get Directions
            </a>
        </SheetShell>
    );
}


function AddRefugeSheet({ onClose, onSubmit }) {
    const [name, setName] = useState('');
    const [power, setPower] = useState('Generator');
    const [services, setServices] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const toggleService = (key) => {
        setServices((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]));
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            await onSubmit({
                name: name.trim() || 'Unnamed Power Source',
                power,
                services: services.length ? services : ['charging'],
            });
        } catch (err) {
            setError("Couldn't save that point — check your connection and try again.");
            setSubmitting(false);
        }
    };

    return (
        <SheetShell onClose={onClose}>
            <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-extrabold text-slate-800">Tag a Power Source</h3>
                <button onClick={onClose} aria-label="Close" className="text-slate-300 hover:text-slate-500 shrink-0">
                    <X size={20} />
                </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
                Know a store, hall, or clinic running on backup power? Add it so neighbors can find it. It'll show as unverified until your barangay confirms it.
            </p>

            <label htmlFor="name" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 ml-1">
                Location Name
            </label>
            <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aling Nena's Store"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl py-3 px-4 mb-4 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />

            <label htmlFor="power" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 ml-1">
                Power Source
            </label>
            <select
                id="power"
                value={power}
                onChange={(e) => setPower(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl py-3 px-4 mb-4 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
                <option>Generator</option>
                <option>Solar</option>
                <option>UPS</option>
                <option>Power Bank Stock</option>
            </select>

            <p className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 ml-1">What's available?</p>
            <div className="flex gap-2 mb-4">
                {Object.entries(SERVICE_META).map(([key, meta]) => {
                    const Icon = meta.icon;
                    const active = services.includes(key);
                    return (
                        <button
                            key={key}
                            onClick={() => toggleService(key)}
                            className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all ${active ? `${meta.bg} ${meta.color} border-current` : 'bg-slate-50 border-transparent text-slate-400'}`}
                        >
                            <Icon size={18} />
                            <span className="text-[10px] font-bold">{meta.label}</span>
                        </button>
                    );
                })}
            </div>

            {error && <p className="text-xs text-red-600 font-medium mb-3">{error}</p>}

            <button
                onClick={handleSubmit}
                disabled={!name.trim() || submitting}
                className="w-full bg-brand-500 hover:bg-brand-900 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2"
            >
                {submitting && <Loader2 size={18} className="animate-spin" />}
                Add to Map
            </button>
        </SheetShell>
    );
}

function ConfirmationSheet({ message, onClose }) {
    return (
        <SheetShell onClose={onClose}>
            <div className="flex flex-col items-center text-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                    <Check className="text-emerald-500" size={28} />
                </div>
                <p className="text-slate-700 font-medium mb-6">{message}</p>
                <button
                    onClick={onClose}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-2xl transition-all"
                >
                    Done
                </button>
            </div>
        </SheetShell>
    );
}

// Reusable component for the bottom filter buttons
function FilterButton({ active, onClick, icon, label, color, bgColor }) {
    return (
        <button
            onClick={onClick}
            aria-pressed={active}
            className={`flex flex-col items-center justify-center p-3 w-full rounded-2xl transition-all duration-200 border-2 ${active
                ? `${bgColor} border-current ${color} shadow-sm transform scale-95`
                : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'
                }`}
        >
            <div className="mb-1">{icon}</div>
            <span className="text-[10px] font-bold tracking-tight">{label}</span>
        </button>
    );
}