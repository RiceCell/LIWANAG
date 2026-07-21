import React, { useState } from 'react';
import { Zap, PlusSquare, ThermometerSnowflake, ShieldCheck, X, Loader2 } from 'lucide-react';

const SERVICE_ICON = { charging: Zap, medical: PlusSquare, cooling: ThermometerSnowflake };

export default function VerificationQueue({ pending, verified, onCertify, onDismiss }) {
    const [busyId, setBusyId] = useState(null);
    const [error, setError] = useState(null);

    const handle = async (action, id) => {
        setBusyId(id);
        setError(null);
        try {
            await action(id);
        } catch (err) {
            setError("Couldn't update that point — check your connection and try again.");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div>
            <header className="mb-6">
                <h2 className="text-xl font-extrabold text-slate-800">Verification queue</h2>
                <p className="text-sm text-slate-500 mt-1">Certify community-reported power sources so they get the official seal on the public map.</p>
            </header>

            {error && (
                <div className="mb-4 bg-red-50 text-red-600 border border-red-100 text-xs px-4 py-3 rounded-xl font-medium">{error}</div>
            )}

            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm divide-y divide-slate-100 mb-8">
                {pending.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-8">Queue is clear — nothing waiting on review.</p>
                )}
                {pending.map((p) => {
                    const Icon = SERVICE_ICON[p.services?.[0]] || Zap;
                    return (
                        <div key={p.id} className="flex items-center gap-4 px-5 py-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                <Icon size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {p.power || 'Unknown source'} · submitted {new Date(p.created_at).toLocaleString()}
                                </p>
                            </div>
                            <button
                                onClick={() => handle(onCertify, p.id)}
                                disabled={busyId === p.id}
                                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors shrink-0"
                            >
                                {busyId === p.id ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                                Certify
                            </button>
                            <button
                                onClick={() => handle(onDismiss, p.id)}
                                disabled={busyId === p.id}
                                className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-500 text-xs font-bold px-3 py-2 rounded-xl transition-colors shrink-0"
                            >
                                <X size={13} /> Dismiss
                            </button>
                        </div>
                    );
                })}
            </div>

            <h3 className="text-sm font-bold text-slate-700 mb-3">Certified points ({verified.length})</h3>
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm divide-y divide-slate-100">
                {verified.length === 0 && <p className="text-sm text-slate-400 text-center py-8">Nothing certified yet.</p>}
                {verified.map((p) => {
                    const Icon = SERVICE_ICON[p.services?.[0]] || Zap;
                    return (
                        <div key={p.id} className="flex items-center gap-4 px-5 py-3.5">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand-500 flex items-center justify-center shrink-0">
                                <Icon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-700 truncate flex items-center gap-1.5">
                                    {p.name} <ShieldCheck size={13} className="text-brand-500 shrink-0" />
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">{p.power || 'Unknown source'}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
