import React from 'react';
import { MapPin, Bell, UserRound } from 'lucide-react';

const TABS = [
    { key: 'map', label: 'Map', icon: MapPin },
    { key: 'alerts', label: 'Alerts', icon: Bell },
    { key: 'profile', label: 'Profile', icon: UserRound },
];

// Sits below the map/sheets (z-400/z-500 respectively don't apply here —
// this is intentionally z-[450], above the map's own overlays so it's
// always reachable, but under bottom sheets and the expanded Dynamic
// Island (z-[490]/[500]) so those still read as modal on top of it.
export default function BottomNav({ active, onNavigate }) {
    return (
        <nav className="fixed bottom-0 inset-x-0 z-[450] bg-white/95 backdrop-blur-sm border-t border-slate-100 pb-[env(safe-area-inset-bottom,0px)]">
            <div className="flex justify-around items-center px-2 py-2 max-w-md mx-auto">
                {TABS.map(({ key, label, icon: Icon }) => {
                    const isActive = active === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onNavigate(key)}
                            aria-current={isActive ? 'page' : undefined}
                            className="flex flex-col items-center gap-1 py-1.5 px-5 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        >
                            <Icon size={20} className={isActive ? 'text-brand-500' : 'text-slate-400'} strokeWidth={isActive ? 2.4 : 2} />
                            <span className={`text-[10px] font-bold ${isActive ? 'text-brand-500' : 'text-slate-400'}`}>{label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}