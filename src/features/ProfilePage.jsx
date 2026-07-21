import React from 'react';
import { WifiOff, Globe2, ShieldCheck, Info, ChevronRight, LogOut, MapPin } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useOfflineStatus } from '../hooks/useOfflineStatus';

// Pulls two letters for the avatar out of a display name if we have one,
// otherwise falls back to the email — same "always show something useful"
// spirit as the rest of the auth flow.
function getInitials(session) {
    const name = session?.user?.user_metadata?.full_name;
    const source = (name || session?.user?.email || '').trim();
    if (!source) return '?';
    const parts = source.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return source.slice(0, 2).toUpperCase();
}

// Static for now — each of these is a real settings screen to build later,
// this just gets the entry points and copy in place.
const SETTINGS = [
    { key: 'offline', icon: WifiOff, label: 'Offline map data', hint: 'Manage what stays on this phone without signal' },
    { key: 'language', icon: Globe2, label: 'Language', hint: 'English / Filipino' },
    { key: 'privacy', icon: ShieldCheck, label: 'Data & privacy', hint: 'What your barangay can see about you' },
    { key: 'about', icon: Info, label: 'About LIWANAG', hint: 'v0.1 — built for Barangay San Isidro' },
];

export default function ProfilePage() {
    const { session, signOut } = useAuth();
    const isOffline = useOfflineStatus();

    const user = session?.user;
    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Resident';
    const barangay = user?.user_metadata?.barangay || 'Barangay San Isidro';
    const purok = user?.user_metadata?.purok || 'Purok not set';

    return (
        // pb-28 (not pb-10) so the Sign Out button clears the bottom nav footer.
        <div className="h-full overflow-y-auto bg-slate-50 px-5 pt-24 pb-28 animate-in fade-in duration-300">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 border-2 border-blue-100 flex items-center justify-center text-brand-500 font-extrabold text-lg shrink-0">
                    {getInitials(session)}
                </div>
                <div className="min-w-0">
                    <p className="font-extrabold text-slate-800 text-base truncate">{displayName}</p>
                    <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                        <MapPin size={12} className="shrink-0" /> {purok} · {barangay}
                    </p>
                </div>
            </div>

            {isOffline && (
                <div className="mb-5 flex items-start gap-2 bg-slate-100 text-slate-500 p-3 rounded-xl text-xs font-medium">
                    <WifiOff size={16} className="shrink-0 mt-0.5" />
                    <span>You're offline. Some settings need a connection to update.</span>
                </div>
            )}

            <div className="space-y-2">
                {SETTINGS.map(({ key, icon: Icon, label, hint }) => (
                    <button
                        key={key}
                        type="button"
                        className="w-full flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3.5 text-left shadow-sm hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                        <Icon size={18} className="text-slate-400 shrink-0" />
                        <span className="flex-1 min-w-0">
                            <span className="block text-sm font-bold text-slate-700">{label}</span>
                            <span className="block text-xs text-slate-400 mt-0.5 truncate">{hint}</span>
                        </span>
                        <ChevronRight size={16} className="text-slate-300 shrink-0" />
                    </button>
                ))}
            </div>

            <button
                type="button"
                onClick={signOut}
                disabled={isOffline}
                className="w-full flex items-center justify-center gap-2 mt-6 text-red-500 font-bold text-sm py-3.5 rounded-2xl border border-red-100 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <LogOut size={16} /> Sign Out
            </button>
        </div>
    );
}