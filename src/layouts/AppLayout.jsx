import React, { useState } from 'react';
import { LogOut, UserRound, RadioTower } from 'lucide-react';
import DynamicIsland from '../components/DynamicIsland';
import BottomNav from '../components/BottomNav';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { useAuth } from '../hooks/useAuth';

// `onNavigate`/`activeView` are optional so this layout still works anywhere
// it doesn't need tab switching — it just won't render the menu items or
// footer that depend on them.
export default function AppLayout({ children, onNavigate, activeView }) {
    const isOffline = useOfflineStatus();
    const { signOut } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);

    const goTo = (view) => {
        setMenuOpen(false);
        onNavigate?.(view);
    };

    return (
        <div className="relative h-full bg-slate-50 overflow-hidden animate-in fade-in duration-500">
            {/* The island persists across all pages wrapped in this layout */}
            <DynamicIsland offlineMode={isOffline} activeOutages={3} />

            {/* Account access — Profile now lives in the bottom nav, so this menu
                is just for things that don't belong on a tab: staff tools and
                signing out. */}
            <div className="fixed top-4 right-4 z-[500]">
                <button
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label="Account menu"
                    aria-expanded={menuOpen}
                    className="w-9 h-9 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700"
                >
                    <UserRound size={18} />
                </button>
                {menuOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                        {onNavigate && (
                            <button
                                onClick={() => goTo('gov')}
                                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                <RadioTower size={16} /> LGU Console
                            </button>
                        )}
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

            {onNavigate && <BottomNav active={activeView} onNavigate={onNavigate} />}
        </div>
    );
}