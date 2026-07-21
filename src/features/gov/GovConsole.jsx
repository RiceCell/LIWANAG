import React, { useState, useEffect, useMemo } from 'react';
import { LayoutGrid, ShieldCheck, Flame, Megaphone, LogOut, RadioTower } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import GovOverview from './GovOverview';
import VerificationQueue from './VerificationQueue';
import BrownoutHeatmap from './BrownoutHeatmap';
import BroadcastPanel from './BroadcastPanel';

const TABS = [
    { key: 'overview', label: 'Overview', icon: LayoutGrid },
    { key: 'queue', label: 'Verification queue', icon: ShieldCheck },
    { key: 'heatmap', label: 'Brownout heatmap', icon: Flame },
    { key: 'broadcast', label: 'Broadcast', icon: Megaphone },
];

// NOTE: this component assumes whoever reaches it is a barangay official.
// There's no role check here yet — that has to land before this is ever
// exposed to real users, since it surfaces every household's outage
// activity and controls what gets broadcast barangay-wide. The plan is a
// `role` claim in user_metadata (or a `staff` table) checked here AND
// enforced with RLS on refuge_points/outage_reports/broadcasts, so a
// citizen account can never read this data even by hitting the API directly.
export default function GovConsole({ onExit }) {
    const { session, signOut } = useAuth();
    const [tab, setTab] = useState('overview');
    const [refuges, setRefuges] = useState([]);
    const [reports, setReports] = useState([]);
    const [broadcasts, setBroadcasts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    useEffect(() => {
        let ignore = false;
        (async () => {
            const [refugeRes, reportRes, broadcastRes] = await Promise.all([
                supabase.from('refuge_points').select('*').order('created_at', { ascending: false }),
                supabase.from('outage_reports').select('*').order('created_at', { ascending: false }).limit(200),
                supabase.from('broadcasts').select('*').order('created_at', { ascending: false }).limit(50),
            ]);
            if (ignore) return;

            const firstError = refugeRes.error || reportRes.error || broadcastRes.error;
            if (firstError) setLoadError(firstError.message);

            setRefuges(refugeRes.data || []);
            setReports(reportRes.data || []);
            setBroadcasts(broadcastRes.data || []);
            setLoading(false);
        })();
        return () => { ignore = true; };
    }, []);

    // Live updates so two officials working the queue at the same time, or a
    // citizen submitting a report mid-review, don't require a page refresh.
    useEffect(() => {
        const channel = supabase
            .channel('gov_console_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'refuge_points' }, (payload) => {
                setRefuges((prev) => {
                    if (payload.eventType === 'INSERT') return [payload.new, ...prev];
                    if (payload.eventType === 'UPDATE') return prev.map((r) => (r.id === payload.new.id ? payload.new : r));
                    if (payload.eventType === 'DELETE') return prev.filter((r) => r.id !== payload.old.id);
                    return prev;
                });
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'outage_reports' }, (payload) => {
                setReports((prev) => [payload.new, ...prev]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const pending = useMemo(() => refuges.filter((r) => !r.verified), [refuges]);
    const verified = useMemo(() => refuges.filter((r) => r.verified), [refuges]);

    const certifyRefuge = async (id) => {
        const { error } = await supabase.from('refuge_points').update({ verified: true }).eq('id', id);
        if (error) throw error;
    };

    const dismissRefuge = async (id) => {
        const { error } = await supabase.from('refuge_points').delete().eq('id', id);
        if (error) throw error;
    };

    const sendBroadcast = async ({ message, puroks }) => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('broadcasts')
            .insert({ message, target_puroks: puroks, created_by: user?.id ?? null })
            .select()
            .single();
        if (error) throw error;
        setBroadcasts((prev) => [data, ...prev]);
    };

    return (
        <div className="min-h-screen w-full flex bg-slate-50">
            <aside className="w-60 shrink-0 border-r border-slate-100 bg-white flex flex-col px-3 py-6">
                <div className="flex items-center gap-2.5 px-2 mb-8">
                    <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shrink-0">
                        <RadioTower size={17} className="text-white" />
                    </div>
                    <div>
                        <p className="font-extrabold text-slate-800 text-sm leading-tight">LIWANAG</p>
                        <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">LGU Console</p>
                    </div>
                </div>

                <nav className="flex-1 space-y-1">
                    {TABS.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tab === key ? 'bg-brand-50 text-brand-500' : 'text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            <Icon size={16} className="shrink-0" />
                            {label}
                            {key === 'queue' && pending.length > 0 && (
                                <span className="ml-auto text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                                    {pending.length}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="border-t border-slate-100 pt-4 mt-4 px-2">
                    <p className="text-xs font-bold text-slate-700 truncate">{session?.user?.email}</p>
                    <p className="text-[11px] text-slate-400 mb-3">Barangay San Isidro</p>
                    {onExit && (
                        <button
                            onClick={onExit}
                            className="w-full text-left text-xs font-semibold text-slate-400 hover:text-slate-600 mb-2"
                        >
                            ← Back to citizen app
                        </button>
                    )}
                    <button
                        onClick={signOut}
                        className="w-full flex items-center gap-2 text-xs font-semibold text-red-500 hover:text-red-600"
                    >
                        <LogOut size={14} /> Sign out
                    </button>
                </div>
            </aside>

            <main className="flex-1 min-w-0 px-8 py-7 overflow-y-auto">
                {loadError && (
                    <div className="mb-5 bg-amber-50 text-amber-700 border border-amber-200 text-xs px-4 py-3 rounded-xl">
                        Some data couldn't load: {loadError}
                    </div>
                )}
                {tab === 'overview' && <GovOverview refuges={refuges} reports={reports} loading={loading} />}
                {tab === 'queue' && (
                    <VerificationQueue pending={pending} verified={verified} onCertify={certifyRefuge} onDismiss={dismissRefuge} />
                )}
                {tab === 'heatmap' && <BrownoutHeatmap reports={reports} />}
                {tab === 'broadcast' && <BroadcastPanel history={broadcasts} onSend={sendBroadcast} />}
            </main>
        </div>
    );
}
