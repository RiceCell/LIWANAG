import React, { useState, useEffect, useMemo } from 'react';
import { LayoutGrid, ShieldCheck, Flame, Megaphone, LogOut, RadioTower, ChevronDown } from 'lucide-react';
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

// A row with no barangay predates the round-8 migration (or came from a
// barangay lookup that failed to match anything). Rather than let those
// rows vanish from every official's view, any staff member can see/act on
// them alongside their own barangay's data — see the migration's comments
// for the full reasoning. This is the client-side mirror of the `barangay
// is null or is_staff_of(barangay)` clause in the refuge_points RLS policy.
function belongsToActiveBarangay(row, activeBarangay) {
    return row.barangay === activeBarangay || row.barangay == null;
}

// `staffBarangays` — the barangay(s) this signed-in user actually has a
// barangay_staff row for (from useIsStaff(), resolved by App.jsx before
// this component ever mounts — see the staffLoading gate there). Every
// fetch, every realtime update, and every broadcast sent from this console
// is scoped to `activeBarangay`, one of the entries in that list. There is
// no "view all barangays" mode here on purpose — see the checklist's own
// "no cross-barangay data access for barangay-level accounts" requirement.
// A future LGU-level (multi-barangay aggregate) tier would be a genuinely
// different screen, not an option bolted onto this one.
export default function GovConsole({ onExit, staffBarangays = [] }) {
    const { session, signOut } = useAuth();
    const [tab, setTab] = useState('overview');
    const [activeBarangay, setActiveBarangay] = useState(staffBarangays[0] ?? null);
    const [barangayMenuOpen, setBarangayMenuOpen] = useState(false);
    const [refuges, setRefuges] = useState([]);
    const [reports, setReports] = useState([]);
    const [broadcasts, setBroadcasts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    useEffect(() => {
        let ignore = false;
        if (!activeBarangay) {
            // Shouldn't happen in practice — App.jsx only renders this
            // component once isStaff is true, which implies at least one
            // barangay_staff row exists. Guard anyway rather than firing
            // off queries with a broken filter.
            setLoading(false);
            return;
        }
        (async () => {
            setLoading(true);
            // `.or('barangay.eq.X,barangay.is.null')` mirrors the RLS escape
            // hatch for legacy/unscoped rows — see belongsToActiveBarangay()
            // above and the migration's comments.
            const scopeFilter = `barangay.eq.${activeBarangay},barangay.is.null`;
            const [refugeRes, reportRes, broadcastRes] = await Promise.all([
                supabase.from('refuge_points').select('*').or(scopeFilter).order('created_at', { ascending: false }),
                supabase.from('brownout_reports').select('*').or(scopeFilter).order('created_at', { ascending: false }).limit(200),
                supabase.from('broadcasts').select('*').or(scopeFilter).order('created_at', { ascending: false }).limit(50),
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
    }, [activeBarangay]);

    // Live updates so two officials working the queue at the same time, or a
    // citizen submitting a report mid-review, don't require a page refresh.
    // Realtime's `filter` option only supports simple `column=eq.value`
    // matches, not the eq-or-null combo the initial fetch above uses, so
    // instead this subscribes to everything on each table and filters in
    // the callback via belongsToActiveBarangay() — same scoping rule,
    // applied client-side instead of server-side for this one case.
    useEffect(() => {
        if (!activeBarangay) return;

        const channel = supabase
            .channel('gov_console_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'refuge_points' }, (payload) => {
                const row = payload.new ?? payload.old;
                if (!belongsToActiveBarangay(row, activeBarangay)) return;
                setRefuges((prev) => {
                    if (payload.eventType === 'INSERT') return [payload.new, ...prev];
                    if (payload.eventType === 'UPDATE') return prev.map((r) => (r.id === payload.new.id ? payload.new : r));
                    if (payload.eventType === 'DELETE') return prev.filter((r) => r.id !== payload.old.id);
                    return prev;
                });
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'brownout_reports' }, (payload) => {
                if (!belongsToActiveBarangay(payload.new, activeBarangay)) return;
                setReports((prev) => [payload.new, ...prev]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [activeBarangay]);

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
            .insert({
                message,
                target_puroks: puroks,
                barangay: activeBarangay, // required by RLS — see is_staff_of() in the round-8 migration
                created_by: user?.id ?? null,
            })
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

                    {/* Shows the barangay this official is actually scoped to,
                        pulled from their real barangay_staff row(s) — no more
                        hardcoded "Barangay San Isidro" regardless of who's
                        signed in. Staff of more than one barangay get a
                        switcher instead of a static label. */}
                    {staffBarangays.length > 1 ? (
                        <div className="relative mb-3">
                            <button
                                onClick={() => setBarangayMenuOpen((v) => !v)}
                                className="w-full flex items-center justify-between gap-1 text-[11px] text-slate-500 font-semibold bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5"
                            >
                                <span className="truncate">{activeBarangay}</span>
                                <ChevronDown size={12} className="shrink-0" />
                            </button>
                            {barangayMenuOpen && (
                                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-100 rounded-lg shadow-lg z-10 overflow-hidden">
                                    {staffBarangays.map((b) => (
                                        <button
                                            key={b}
                                            onClick={() => { setActiveBarangay(b); setBarangayMenuOpen(false); }}
                                            className={`w-full text-left text-[11px] px-2.5 py-2 font-semibold ${b === activeBarangay ? 'text-brand-500 bg-brand-50' : 'text-slate-600 hover:bg-slate-50'
                                                }`}
                                        >
                                            {b}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-[11px] text-slate-400 mb-3">{activeBarangay || 'No barangay assigned'}</p>
                    )}

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