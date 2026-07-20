import React from 'react';
import { RadioTower, ShieldCheck } from 'lucide-react';

export default function LandingPage({ onGetStarted }) {
    return (
        <div className="flex flex-col items-center justify-between h-full bg-white px-6 py-12 animate-in fade-in duration-500">
            <div className="flex-1 flex flex-col items-center justify-center w-full">

                {/* Beacon logo */}
                <div className="w-40 h-40 bg-brand-50 rounded-full flex items-center justify-center mb-8 border-[8px] border-blue-100 shadow-inner">
                    <RadioTower size={64} className="text-brand-500" />
                </div>

                {/* Branding */}
                <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight mb-2">
                    LIWANAG
                </h1>
                <p className="text-center text-slate-500 font-medium max-w-xs text-lg leading-tight">
                    Community Energy Refuge Network
                </p>

                {/* Subtitle / context */}
                <p className="text-center text-slate-400 text-sm mt-8 max-w-xs">
                    Find backup power, medical charging stations, and verified shelters during emergency brownouts.
                </p>

                {/* Trust signal — this is an official coordination tool, not a
                    random community app, and people should know that at a glance. */}
                <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-6 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full">
                    <ShieldCheck size={14} className="text-brand-500" />
                    <span>Coordinated with your Barangay & LGU</span>
                </div>
            </div>

            {/* Action button */}
            <div className="w-full max-w-sm pb-8">
                <button
                    onClick={onGetStarted}
                    className="w-full bg-brand-500 hover:bg-brand-900 active:scale-95 transition-all text-white font-bold text-lg py-4 rounded-full shadow-lg shadow-blue-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500"
                >
                    Get Started
                </button>
                <p className="text-center text-slate-300 text-xs mt-4">
                    Works even when your data connection doesn't.
                </p>
            </div>
        </div>
    );
}