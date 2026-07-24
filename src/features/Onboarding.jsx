import React, { useState, useEffect } from 'react';
import { MapPin, Loader2, RadioTower } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { extractBarangayNames } from '../lib/geoUtils';

// Shown whenever a signed-in user has no barangay on file yet — see the
// gating logic in App.jsx. Saves to `user_metadata` (same place
// ProfilePage.jsx already reads `barangay`/`purok` from), not a separate
// table, to match how those fields were already being used before this
// screen existed.
export default function Onboarding({ onComplete }) {
    const [barangayList, setBarangayList] = useState([]);
    const [barangay, setBarangay] = useState('');
    const [purok, setPurok] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch('/cebu-city.json')
            .then((res) => res.json())
            .then((data) => setBarangayList(extractBarangayNames(data)))
            .catch((err) => console.error('Error loading barangay list:', err));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!barangay) return;
        setSaving(true);
        setError(null);
        try {
            // updateUser() fires a USER_UPDATED event through
            // supabase.auth.onAuthStateChange, which useAuth.jsx already
            // listens for — session.user.user_metadata refreshes on its
            // own. onComplete() below is just the explicit "now navigate"
            // step rather than relying purely on that to redraw in time.
            const { error: updateError } = await supabase.auth.updateUser({
                data: { barangay, purok: purok.trim() || null },
            });
            if (updateError) throw updateError;
            onComplete();
        } catch (err) {
            setError("Couldn't save that — check your connection and try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto bg-slate-50 flex flex-col justify-center px-6 py-12 animate-in fade-in duration-300">
            <div className="w-full max-w-md mx-auto">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
                    <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mb-5 border-2 border-blue-100">
                        <RadioTower size={26} className="text-brand-500" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-800">Where are you based?</h2>
                    <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                        LIWANAG shows you refuge points and alerts for your area — this only takes a second.
                    </p>

                    {error && (
                        <div className="mt-5 bg-red-50 text-red-600 border border-red-100 text-sm px-3 py-2.5 rounded-xl font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 ml-1">
                                Barangay *
                            </label>
                            <select
                                required
                                value={barangay}
                                onChange={(e) => setBarangay(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                            >
                                <option value="" disabled>
                                    {barangayList.length === 0 ? 'Loading barangays…' : 'Select your barangay'}
                                </option>
                                {barangayList.map((name) => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 ml-1">
                                Purok / Sitio / Street (optional)
                            </label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={purok}
                                    onChange={(e) => setPurok(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                    placeholder="e.g. Purok 3"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving || !barangay}
                            className="w-full bg-brand-500 hover:bg-brand-900 text-white font-bold text-lg py-3.5 rounded-2xl shadow-lg shadow-blue-500/30 transition-all flex justify-center items-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {saving && <Loader2 size={20} className="animate-spin" />}
                            Continue
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}