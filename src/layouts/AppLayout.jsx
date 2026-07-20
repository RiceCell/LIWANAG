import React, { useState } from 'react';
import { LogOut, UserRound } from 'lucide-react';
import DynamicIsland from '../components/DynamicIsland';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { useAuth } from '../hooks/useAuth';

export default function AppLayout({ children }) {
    const isOffline = useOfflineStatus();
    const { signOut } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div className="relative h-full bg-slate-50 overflow-hidden animate-in fade-in duration-500">
            {/* The island persists across all pages wrapped in this layout */}
            <DynamicIsland offlineMode={isOffline} activeOutages={3} />

            {/* Account access — small and out of the way, but present on every
                screen so a signed-in user can always find their way to sign out. */}
            <div className="fixed top-4 right-4 z-50">
                <button
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label="Account menu"
                    aria-expanded={menuOpen}
                    className="w-9 h-9 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700"
                >
                    <UserRound size={18} />
                </button>
                {menuOpen && (
                    <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                        <button
                            onClick={() => { setMenuOpen(false); signOut(); }}
                            disabled={isOffline}
                            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <LogOut size={16} /> Sign Out
                        </button>
                        {isOffline && (
                            <p className="text-[10px] text-slate-400 px-3 pb-1.5">Reconnect to sign out</p>
                        )}
                    </div>
                )}
            </div>

            {/* The specific page content gets injected here */}
            <main className="w-full h-full">
                {children}
            </main>
        </div>
    );
}