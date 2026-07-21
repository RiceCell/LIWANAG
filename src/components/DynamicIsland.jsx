import React, { useState, useRef, useEffect } from 'react';
import { ShieldAlert, BatteryCharging, WifiOff, MapPin, ChevronDown } from 'lucide-react';

export default function DynamicIsland({ offlineMode, activeOutages, refugeCount = 12, zoneName = 'Purok 1 Zone Area' }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const islandRef = useRef(null);

    // Close when tapping/clicking anywhere outside the island — expected
    // behavior for any overlay, and prevents it from blocking the map underneath.
    useEffect(() => {
        if (!isExpanded) return;
        const handleOutside = (e) => {
            if (islandRef.current && !islandRef.current.contains(e.target)) {
                setIsExpanded(false);
            }
        };
        document.addEventListener('pointerdown', handleOutside);
        return () => document.removeEventListener('pointerdown', handleOutside);
    }, [isExpanded]);

    const toggle = () => setIsExpanded((prev) => !prev);
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
        }
        if (e.key === 'Escape') setIsExpanded(false);
    };

    return (
        <>
            {/* Dims whatever's underneath (the search bar, stat cards, map) while
                expanded — without this, the island and the map's top overlay sit
                on different stacking contexts and visually collide instead of one
                cleanly covering the other. */}
            {isExpanded && (
                <div
                    className="fixed inset-0 z-[490] bg-slate-900/30 animate-in fade-in duration-200"
                    aria-hidden="true"
                />
            )}
            <div className="fixed top-4 left-0 right-0 z-[500] flex justify-center px-4 pointer-events-none">
                <div
                    ref={islandRef}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? 'Collapse status panel' : 'Expand status panel'}
                    onClick={toggle}
                    onKeyDown={handleKeyDown}
                    className={`
            pointer-events-auto bg-black text-white rounded-full transition-all duration-300 ease-in-out shadow-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-white
            ${isExpanded ? 'w-full max-w-sm rounded-[28px] p-5' : 'w-52 h-10 px-3'}
          `}
                >
                    {!isExpanded ? (
                        // Compact idle / notification view
                        <div className="flex items-center justify-between w-full text-xs font-medium">
                            {offlineMode ? (
                                <div className="flex items-center gap-1.5 text-amber-400">
                                    <WifiOff size={14} /> <span>Offline cache</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-emerald-400">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>Brgy. monitoring</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1 bg-zinc-800 px-2 py-0.5 rounded-full text-[10px]">
                                <ShieldAlert size={12} className={activeOutages > 0 ? 'text-red-400' : 'text-zinc-500'} />
                                <span>{activeOutages > 0 ? `${activeOutages} outages` : 'All clear'}</span>
                            </div>
                        </div>
                    ) : (
                        // Expanded interactive view
                        <div className="w-full flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-sm tracking-wide">LIWANAG STATUS</h4>
                                    <p className="text-xs text-zinc-400">{zoneName}</p>
                                </div>
                                <ChevronDown size={16} className="text-zinc-500 transition-transform duration-300 rotate-180" />
                            </div>

                            <hr className="border-zinc-800" />

                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-zinc-900 p-3 rounded-xl flex items-center gap-3">
                                    <BatteryCharging className="text-cyan-400 shrink-0" size={20} />
                                    <div>
                                        <p className="text-[10px] text-zinc-500 font-semibold">REFUGE STATIONS</p>
                                        <p className="text-xs font-bold">{refugeCount} operational</p>
                                    </div>
                                </div>
                                <div className="bg-zinc-900 p-3 rounded-xl flex items-center gap-3">
                                    <ShieldAlert className={`shrink-0 ${activeOutages > 0 ? 'text-red-400' : 'text-emerald-400'}`} size={20} />
                                    <div>
                                        <p className="text-[10px] text-zinc-500 font-semibold">ACTIVE OUTAGES</p>
                                        <p className="text-xs font-bold">
                                            {activeOutages > 0 ? `${activeOutages} streets affected` : 'None reported'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {offlineMode && (
                                <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs p-2.5 rounded-xl flex items-center gap-2">
                                    <MapPin size={14} className="shrink-0" />
                                    <span>No connection — showing the last data saved to this phone.</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}