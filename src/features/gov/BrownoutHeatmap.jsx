import React, { useMemo } from 'react';
import { PUROKS, extractPurok } from './purokUtils';

export default function BrownoutHeatmap({ reports }) {
    const cells = useMemo(() => {
        const byPurok = {};
        PUROKS.forEach((p) => { byPurok[p] = []; });
        reports.forEach((r) => {
            const p = extractPurok(r.street);
            if (byPurok[p]) byPurok[p].push(r);
        });

        return PUROKS.map((purok) => {
            // Oldest-first within the purok so we can walk onset → restored pairs.
            const list = byPurok[purok].slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            const last = list[list.length - 1];
            let status = 'clear';
            let hours = 0;

            if (last) {
                if (last.kind === 'onset') {
                    status = 'ongoing';
                    hours = (Date.now() - new Date(last.created_at).getTime()) / 3600000;
                } else {
                    status = 'recovered';
                    const onset = list[list.length - 2];
                    hours = onset ? (new Date(last.created_at) - new Date(onset.created_at)) / 3600000 : 0;
                }
            }
            return { purok, status, hours, reportCount: list.length };
        });
    }, [reports]);

    const colorFor = (cell) => {
        if (cell.status === 'clear') return { text: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-100' };
        if (cell.status === 'ongoing' || cell.hours > 4) return { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' };
        if (cell.hours > 1) return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' };
        return { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' };
    };

    const chronic = cells.filter((c) => c.status === 'ongoing' || c.hours > 4);

    return (
        <div>
            <header className="mb-6">
                <h2 className="text-xl font-extrabold text-slate-800">Brownout heatmap</h2>
                <p className="text-sm text-slate-500 mt-1">Outage duration by purok, built from citizen reports — the pattern your utility bill never shows.</p>
            </header>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 mb-6">
                {cells.map((cell) => {
                    const c = colorFor(cell);
                    return (
                        <div key={cell.purok} className={`rounded-2xl border ${c.border} ${c.bg} px-3 py-4 text-center`}>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{cell.purok}</p>
                            <p className={`text-lg font-extrabold mt-1.5 ${c.text}`}>
                                {cell.status === 'clear' ? '—' : `${cell.hours.toFixed(1)}h`}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">
                                {cell.status === 'ongoing' ? 'ongoing' : cell.status === 'clear' ? 'no reports' : 'last outage'}
                            </p>
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 bg-white border border-slate-100 rounded-2xl px-4 py-3 mb-6">
                <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Under 1h</span>
                <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> 1–4h</span>
                <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Over 4h or still ongoing</span>
            </div>

            {chronic.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                    <h3 className="text-sm font-bold text-slate-700 mb-1.5">Infrastructure note</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        {chronic.map((c) => c.purok).join(' and ')} {chronic.length === 1 ? 'is' : 'are'} showing outages over 4 hours.
                        This is the kind of pattern that supports a generator deployment request to the DILG regional office.
                    </p>
                </div>
            )}
        </div>
    );
}
