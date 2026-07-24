import React, { useState, useEffect } from 'react';
import { Radio, ShieldCheck, WifiOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useOfflineStatus } from '../hooks/useOfflineStatus';

// A broadcast with no barangay predates the round-8 migration (broadcasts
// didn't always have this column). Rather than let those vanish for
// everyone, they're shown to any citizen alongside their own barangay's
// broadcasts — same "barangay is null or matches" rule GovConsole.jsx
// already uses for refuge_points/brownout_reports.
function belongsToUserBarangay(broadcast, userBarangay) {
    return broadcast.barangay === userBarangay || broadcast.barangay == null;
}

export default function AlertsPage() {
    const { session } = useAuth();
    const userBarangay = session?.user?.user_metadata?.barangay ?? null;
    // Scoped per barangay so switching accounts on the same device (or a
    // citizen who was in a different barangay before a re-onboarding)
    // never shows another barangay's cached alerts while offline.
    const cacheKey = userBarangay ? `liwanag-broadcasts-cache-${userBarangay}` : null;

    const [broadcasts, setBroadcasts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const isOffline = useOfflineStatus();

    useEffect(() => {
        let ignore = false;

        // App.jsx's onboarding gate means this should always be set by the
        // time someone reaches this screen — this guard just avoids an
        // unfiltered flash of every barangay's broadcasts on the off
        // chance it isn't ready yet.
        if (!userBarangay) {
            setLoading(false);
            return;
        }

        (async () => {
            const { data, error } = await supabase
                .from('broadcasts')
                .select('*')
                .or(`barangay.eq.${userBarangay},barangay.is.null`)
                .order('created_at', { ascending: false })
                .limit(50);

            if (ignore) return;

            if (error) {
                setLoadError(error.message);
                // Fall back to whatever we last saw, so a resident checking this
                // mid-brownout with no signal still sees the last known alerts
                // instead of an empty screen.
                try {
                    const cached = localStorage.getItem(cacheKey);
                    if (cached) setBroadcasts(JSON.parse(cached));
                } catch { /* corrupted cache — just show empty state */ }
            } else {
                setBroadcasts(data || []);
                localStorage.setItem(cacheKey, JSON.stringify(data || []));
            }
            setLoading(false);
        })();
        return () => { ignore = true; };
    }, [userBarangay, cacheKey]);

    useEffect(() => {
        if (!userBarangay) return;

        const channel = supabase
            .channel('broadcasts_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcasts' }, (payload) => {
                // Realtime filters only support simple column=eq.value
                // matches, not the eq-or-null combo the fetch above uses —
                // so this subscribes to all inserts and filters here instead,
                // same approach GovConsole.jsx uses for its own tables.
                if (!belongsToUserBarangay(payload.new, userBarangay)) return;
                setBroadcasts((prev) => {
                    const next = [payload.new, ...prev];
                    localStorage.setItem(cacheKey, JSON.stringify(next));
                    return next;
                });
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [userBarangay, cacheKey]);

    return (
        <div className="h-full overflow-y-auto bg-slate-50 px-5 pt-24 pb-28 animate-in fade-in duration-300">
            <h1 className="text-xl font-extrabold text-slate-800 mb-1">Barangay Alerts</h1>
            <p className="text-sm text-slate-500 mb-5">
                {userBarangay ? `Official broadcasts from ${userBarangay}.` : 'Official broadcasts for your barangay.'}
            </p>

            {isOffline && (
                <div className="mb-4 flex items-start gap-2 bg-slate-100 text-slate-500 p-3 rounded-xl text-xs font-medium">
                    <WifiOff size={16} className="shrink-0 mt-0.5" />
                    <span>You're offline — showing the last alerts saved to this phone.</span>
                </div>
            )}
            {loadError && !isOffline && (
                <div className="mb-4 bg-amber-50 text-amber-700 border border-amber-200 text-xs px-3 py-2 rounded-xl">
                    Couldn't reach the server — showing the last saved copy.
                </div>
            )}

            {loading ? (
                <p className="text-sm text-slate-400 text-center py-10">Loading alerts…</p>
            ) : broadcasts.length === 0 ? (
                <div className="text-center py-14">
                    <Radio size={28} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">No alerts yet. Your barangay's announcements will show up here.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {broadcasts.map((b) => (
                        <div key={b.id} className="bg-white border border-slate-100 border-l-4 border-l-brand-500 rounded-2xl px-4 py-3.5 shadow-sm">
                            <div className="flex items-center justify-between mb-1.5 gap-2">
                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-brand-500 uppercase tracking-wide shrink-0">
                                    <ShieldCheck size={12} /> {b.barangay || userBarangay || 'Barangay'}
                                </span>
                                <span className="text-[11px] text-slate-400 font-medium text-right">{new Date(b.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{b.message}</p>
                            {b.target_puroks?.length > 0 && (
                                <p className="text-[11px] text-slate-400 mt-1.5">{b.target_puroks.join(', ')}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}