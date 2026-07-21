import React, { useState } from 'react';
import { Megaphone, Loader2 } from 'lucide-react';
import { PUROKS } from './purokUtils';

export default function BroadcastPanel({ history, onSend }) {
    const [message, setMessage] = useState('');
    const [selected, setSelected] = useState(['Purok 3']);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);

    const togglePurok = (p) => {
        setSelected((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
    };

    const handleSend = async () => {
        if (!message.trim() || selected.length === 0) return;
        setSending(true);
        setError(null);
        try {
            await onSend({ message: message.trim(), puroks: selected });
            setMessage('');
        } catch (err) {
            setError("Couldn't send that broadcast — check your connection and try again.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div>
            <header className="mb-6">
                <h2 className="text-xl font-extrabold text-slate-800">Broadcast</h2>
                <p className="text-sm text-slate-500 mt-1">
                    Send a message straight to every resident app in the puroks you pick — no more shouting or hoping a Facebook post lands.
                </p>
            </header>

            <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Target puroks</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {PUROKS.map((p) => (
                            <button
                                key={p}
                                onClick={() => togglePurok(p)}
                                className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 transition-colors ${selected.includes(p) ? 'bg-brand-50 border-brand-500 text-brand-500' : 'bg-slate-50 border-transparent text-slate-400'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                        placeholder="e.g. Barangay Hall generator is online, charging stations open until 8 PM."
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl py-3 px-4 mb-3 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none text-sm"
                    />
                    {error && <p className="text-xs text-red-600 font-medium mb-3">{error}</p>}
                    <button
                        onClick={handleSend}
                        disabled={sending || !message.trim() || selected.length === 0}
                        className="flex items-center gap-2 bg-brand-500 hover:bg-brand-900 disabled:opacity-50 text-white font-bold text-sm px-5 py-3 rounded-2xl transition-all"
                    >
                        {sending ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />}
                        Send broadcast
                    </button>
                </div>

                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">History</p>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                        {history.length === 0 && <p className="text-sm text-slate-400 text-center py-6">No broadcasts sent yet.</p>}
                        {history.map((b) => (
                            <div key={b.id} className="border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                                <p className="text-sm text-slate-700 font-medium">{b.message}</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {(b.target_puroks || []).join(', ') || 'All puroks'} · {new Date(b.created_at).toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
