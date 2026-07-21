import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';

export function ReportBrownout({ onBack }) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        purok: '',
        street: '',
        notes: '',
        lat: null,
        lng: null
    });

    // Automatically fetch the user's location when they click this button
    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }

        // Change button text temporarily if you want, or just let them know it's loading
        alert("Requesting location... Please click 'Allow' if prompted.");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({
                    ...prev,
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                }));
                alert("Location pinned successfully!"); // Quick feedback
            },
            (error) => {
                // THIS tells us exactly why it failed!
                console.warn("Location error:", error.message);
                if (error.code === 1) {
                    alert("Permission denied. Please allow location access in your browser settings.");
                } else if (error.code === 2) {
                    alert("Position unavailable. Make sure your device's GPS/location is turned on.");
                } else if (error.code === 3) {
                    alert("Request timed out. Please try again.");
                } else {
                    alert("An unknown error occurred while getting location.");
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Get the currently logged-in user
            const { data: { session } } = await supabase.auth.getSession();

            // Insert the report into your Supabase database
            const { error } = await supabase
                .from('brownout_reports')
                .insert([
                    {
                        purok: formData.purok,
                        street: formData.street,
                        notes: formData.notes,
                        lat: formData.lat,
                        lng: formData.lng,
                        reporter_id: session?.user?.id || null, // Matches your column exactly
                        status: 'active'
                    }
                ]);

            if (error) throw error;

            setSuccess(true);
            setTimeout(() => {
                onBack(); // Go back to map after 2 seconds
            }, 2000);

        } catch (error) {
            console.error("Error submitting report:", error.message);
            alert("Failed to submit report. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 animate-in fade-in">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle size={32} className="text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Report Submitted</h2>
                <p className="text-slate-500 text-center mt-2">Barangay officials have been notified. Stay safe.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col animate-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="bg-white px-4 py-4 flex items-center shadow-sm z-10">
                <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-lg font-bold text-slate-800 ml-2">Report Brownout</h1>
            </div>

            {/* Form */}
            <div className="flex-1 p-6">
                <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">

                    {/* Location Getter */}
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex flex-col gap-3">
                        <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Location Data</p>
                        <button
                            type="button"
                            onClick={handleGetLocation}
                            className="w-full bg-white border border-blue-200 text-blue-600 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
                        >
                            <MapPin size={18} />
                            {formData.lat ? 'Location Pinned ✓' : 'Tap to Pin Current Location'}
                        </button>
                        {formData.lat && (
                            <p className="text-[10px] text-blue-600/70 text-center font-mono">
                                {formData.lat.toFixed(5)}, {formData.lng.toFixed(5)}
                            </p>
                        )}
                    </div>

                    {/* Purok Input (Required) */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 ml-1">
                            Purok / Sitio *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.purok}
                            onChange={(e) => setFormData({ ...formData, purok: e.target.value })}
                            className="w-full bg-white border border-slate-200 text-slate-800 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-sm"
                            placeholder="e.g. Purok 1"
                        />
                    </div>

                    {/* Street Input (Optional) */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 ml-1">
                            Street (Optional)
                        </label>
                        <input
                            type="text"
                            value={formData.street}
                            onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                            className="w-full bg-white border border-slate-200 text-slate-800 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-sm"
                            placeholder="e.g. Rizal Street"
                        />
                    </div>

                    {/* Notes Input (Optional) */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 ml-1">
                            Additional Notes (Optional)
                        </label>
                        <textarea
                            rows="3"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full bg-white border border-slate-200 text-slate-800 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-sm resize-none"
                            placeholder="Any downed wires or sparking posts?"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || !formData.purok}
                        className="w-full bg-red-500 hover:bg-red-600 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-red-500/30 transition-all flex justify-center items-center gap-2 mt-4 disabled:opacity-50 disabled:shadow-none"
                    >
                        {loading ? <Loader2 size={24} className="animate-spin" /> : <AlertTriangle size={24} />}
                        Submit Emergency Report
                    </button>
                </form>
            </div>
        </div>
    );
}