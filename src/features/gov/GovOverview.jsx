import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ShieldCheck, PlusSquare, TriangleAlert } from 'lucide-react';
import { PUROKS, normalizePurok } from './purokUtils';

function StatCard({ label, value, hint }) {
    return (
        <div className="bg-white border border-slate-100 rounded-2xl px-5 py-4 shadow-sm">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1.5">{value}</p>
            {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
        </div>
    );
}

function relativeTime(dateStr) {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
}

// `reports` here is `brownout_reports` (structured `purok`, real GPS via
// ReportBrownout.jsx, `status` defaulting to 'active'). It replaced the
// legacy `outage_reports` (free-text street, onset/restored `kind`) as the
// data source for this screen. Note: brownout_reports currently has no way
// to mark a report resolved — everything inserted comes in as 'active' and
// stays that way, so "active now" below really means "ever reported and
// never explicitly cleared." Revisit once officials have a way to resolve
// a report from the console.
export default function GovOverview({ refuges, reports, loading }) {
    const verifiedCount = refuges.filter((r) => r.verified).length;
    const pendingCount = refuges.length - verifiedCount;

    const activePuroks = useMemo(() => {
        const puroks = new Set();
        reports.forEach((r) => {
            if (r.status === 'active') puroks.add(normalizePurok(r.purok));
        });
        return [...puroks];
    }, [reports]);

    const reportsToday = reports.filter((r) => Date.now() - new Date(r.created_at).getTime() < 24 * 60 * 60 * 1000).length;

    const chartData = useMemo(() => {
        const counts = Object.fromEntries(PUROKS.map((p) => [p, 0]));
        reports.forEach((r) => {
            const p = normalizePurok(r.purok);
            if (counts[p] !== undefined) counts[p] += 1;
        });
        return PUROKS.map((p) => ({ purok: p.replace('Purok ', 'P'), reports: counts[p] }));
    }, [reports]);

    const activity = useMemo(() => {
        const refugeEvents = refuges.slice(0, 5).map((r) => ({
            id: `refuge-${r.id}`,
            icon: r.verified ? ShieldCheck : PlusSquare,
            color: r.verified ? 'text-brand-500' : 'text-amber-500',
            text: r.verified ? `"${r.name}" certified as a refuge point` : `"${r.name}" submitted for verification`,
            when: r.created_at,
        }));
        // Every brownout_reports row is currently a fresh emergency report
        // (there's no "restored" counterpart yet), so this always reads as
        // a report rather than branching on a kind that doesn't exist here.
        const reportEvents = reports.slice(0, 5).map((r) => ({
            id: `report-${r.id}`,
            icon: TriangleAlert,
            color: 'text-red-500',
            text: `Brownout reported — ${r.purok || 'Unspecified purok'}${r.street ? `, ${r.street}` : ''}`,
            when: r.created_at,
        }));
        return [...refugeEvents, ...reportEvents]
            .sort((a, b) => new Date(b.when) - new Date(a.when))
            .slice(0, 6);
    }, [refuges, reports]);

    return (
        <div>
            <header className="mb-6">
                <h2 className="text-xl font-extrabold text-slate-800">Overview</h2>
                <p className="text-sm text-slate-500 mt-1">Live picture of energy access across Barangay San Isidro.</p>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard label="Brownouts active now" value={loading ? '—' : activePuroks.length} hint={activePuroks.length ? activePuroks.join(', ') : 'No open reports'} />
                <StatCard label="Refuge points online" value={loading ? '—' : `${verifiedCount}/${refuges.length}`} hint={`${pendingCount} pending review`} />
                <StatCard label="Reports today" value={loading ? '—' : reportsToday} hint="Citizen emergency reports" />
                <StatCard label="Puroks covered" value={PUROKS.length} hint="Barangay San Isidro" />
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-700">Reports by purok</h3>
                    <span className="text-[11px] text-slate-400 font-semibold">ALL TIME · CITIZEN REPORTS</span>
                </div>
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="purok" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: 12, borderColor: '#E2E8F0', fontSize: 12 }} />
                            <Bar dataKey="reports" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={36} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-3">Recent activity</h3>
                {activity.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Nothing to show yet.</p>}
                <div className="space-y-1">
                    {activity.map(({ id, icon: Icon, color, text, when }) => (
                        <div key={id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                            <Icon size={16} className={`${color} shrink-0`} />
                            <p className="flex-1 text-sm text-slate-600">{text}</p>
                            <p className="text-xs text-slate-400 shrink-0">{relativeTime(when)}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}